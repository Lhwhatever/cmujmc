import {
  authedProcedure,
  AuthorizationError,
  publicProcedure,
  router,
} from '../trpc';
import schema from '../../protocol/schema';
import { prisma } from '../prisma';
import { NotFoundError } from '../../protocol/errors';
import { GameMode, Prisma, Status } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { getNumPlayers } from '../../utils/gameModes';
import { z } from 'zod';
import {
  computePlacements,
  computeTransactions,
  sumTableScores,
  umaSelector,
} from '../../utils/scoring';
import {
  coalesceNames,
  maskNames,
  UserGroups,
  userSelector,
} from '../../utils/usernames';
import { markStale } from '../leaderboard/worker';
import { Session } from 'next-auth';
import assertNonNull from '../../utils/nullcheck';
import { cachedGetUserGroups } from '../cache/userGroups';

//==================== for create ====================

const validateCreateMatchPlayers = async (
  players: z.infer<typeof schema.match.create>['players'],
  gameMode: GameMode,
  requester: Session['user'],
) => {
  let hasSubmittingPlayer = false;
  let registeredPlayers = new Set();
  let unregisteredPlayers = new Set();

  for (const player of players) {
    switch (player.type) {
      case 'unregistered':
        unregisteredPlayers = unregisteredPlayers.add(player.payload);
        break;
      case 'registered': {
        const id = player.payload;
        const user = await prisma.user.findUnique({ where: { id } });
        if (user === null) {
          throw new NotFoundError('user', id);
        }
        registeredPlayers = registeredPlayers.add(id);
        hasSubmittingPlayer = hasSubmittingPlayer || id === requester.id;
        break;
      }
    }
  }

  if (requester.role !== 'admin' && !hasSubmittingPlayer) {
    new AuthorizationError({
      reason: 'Cannot submit on behalf of other players as non-admin',
    }).logAndThrow();
  }

  if (
    getNumPlayers(gameMode) !==
    registeredPlayers.size + unregisteredPlayers.size
  ) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Incorrect number of players',
    });
  }
};

//==================== for record ====================

const matchSelectorInRecord = Prisma.validator<Prisma.MatchSelect>()({
  status: true,
  players: { select: { playerId: true, txns: true } },
  parent: { select: { parent: { select: { id: true } } } },
  ruleset: {
    select: {
      startPts: true,
      returnPts: true,
      chomboDelta: true,
      uma: umaSelector,
    },
  },
});

const validateInRecord = (
  match: Prisma.MatchGetPayload<{ select: typeof matchSelectorInRecord }>,
  input: z.infer<typeof schema.match.record>,
  requesterId: string,
  requesterRole: 'admin' | 'user',
) => {
  if (
    requesterRole !== 'admin' &&
    (input.time !== undefined ||
      match.status !== Status.PENDING ||
      match.players.every(({ playerId }) => playerId !== requesterId))
  ) {
    new AuthorizationError({}).logAndThrow();
  }

  if (input.players.length !== match.players.length) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Number of players does not match',
    });
  }

  const scores = input.players.map(({ score }) => score);
  if (
    sumTableScores(scores, input.leftoverBets) !==
    match.ruleset.startPts * scores.length
  ) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Total score does not add up',
    });
  }
  return scores;
};

//==================== for the rest ====================

const matchIncludes = Prisma.validator<Prisma.MatchInclude>()({
  players: {
    select: {
      playerPosition: true,
      placementMin: true,
      placementMax: true,
      rawScore: true,
      unregisteredPlaceholder: true,
      player: userSelector,
    },
    orderBy: { playerPosition: 'asc' },
  },
  ruleset: true,
});

type Match = Prisma.MatchGetPayload<{ include: typeof matchIncludes }>;

const transformMatchPlayer = (
  { player, ...rest }: Match['players'][number],
  userGroups: UserGroups,
) => ({
  player: player && maskNames(coalesceNames(player), userGroups),
  ...rest,
});

const transformMatch = (
  { players, ...rest }: Match,
  userGroups: UserGroups,
) => ({
  ...rest,
  players: players.map((player) => transformMatchPlayer(player, userGroups)),
});

const matchRouter = router({
  create: authedProcedure
    .input(schema.match.create)
    .mutation(async ({ ctx, input }) => {
      const userGroups = await cachedGetUserGroups(ctx.session?.user?.id);
      const event = await prisma.event.findUnique({
        where: { id: input.eventId },
        select: { ruleset: { select: { id: true, gameMode: true } } },
      });

      if (event === null) {
        throw new NotFoundError('event', input.eventId);
      }

      await validateCreateMatchPlayers(
        input.players,
        event.ruleset.gameMode,
        ctx.user,
      );

      const match = await prisma.match.create({
        data: {
          status: Status.PENDING,
          ruleset: { connect: { id: event.ruleset.id } },
          parent: { connect: { id: input.eventId } },
          players: {
            createMany: {
              data: input.players.map((player, index) => {
                switch (player.type) {
                  case 'registered':
                    return {
                      playerPosition: index + 1,
                      playerId: player.payload,
                    };
                  case 'unregistered':
                    return {
                      playerPosition: index + 1,
                      unregisteredPlaceholder: player.payload,
                    };
                }
              }),
            },
          },
        },
        include: matchIncludes,
      });

      return { match: transformMatch(match, userGroups) };
    }),

  getById: publicProcedure
    .input(z.number())
    .query(async ({ input: id, ctx }) => {
      const userGroups = await cachedGetUserGroups(ctx.session?.user?.id);
      const match: Match | null = await prisma.match.findUnique({
        include: matchIncludes,
        where: { id },
      });
      if (match === null) {
        throw new NotFoundError('match', id);
      }
      return { match: transformMatch(match, userGroups) };
    }),

  record: authedProcedure
    .input(schema.match.record)
    .mutation(async ({ ctx, input }) => {
      const leagueId = await prisma.$transaction(async (tx) => {
        const { matchId, players } = input;
        const match = await tx.match.findUnique({
          where: { id: matchId },
          select: matchSelectorInRecord,
        });

        if (match === null) {
          throw new NotFoundError('match', matchId);
        }

        // validation
        const scores = validateInRecord(
          match,
          input,
          ctx.user.id,
          ctx.user.role,
        );

        // compute and update match results
        const time = input.time ?? new Date();
        const placements = computePlacements(scores);

        const uma = match.ruleset.uma.map(({ value }) => value);

        await tx.match.update({
          where: { id: matchId },
          data: { status: Status.COMPLETE, time },
        });

        for (let i = 0; i < scores.length; ++i) {
          await tx.userMatch.update({
            where: {
              matchId_playerPosition: { matchId, playerPosition: i + 1 },
            },
            data: {
              ...placements[i],
              rawScore: scores[i],
              chombos: players[i].chombos.length,
            },
          });
        }

        // update league scores
        const leagueId = match.parent?.parent.id;
        if (leagueId === undefined) return;

        const { chomboDelta } = match.ruleset;

        const userLeagues = await tx.userLeague.findMany({
          where: {
            leagueId,
            userId: {
              in: match.players.flatMap(({ playerId }) =>
                playerId === null ? [] : [playerId],
              ),
            },
          },
          select: { userId: true, freeChombos: true },
        });

        await tx.userLeagueTransaction.deleteMany({
          where: { userMatchMatchId: matchId },
        });

        for (let i = 0; i < match.players.length; ++i) {
          const { playerId } = match.players[i];

          // only for registered players
          if (playerId === null) continue;
          const userLeague = userLeagues.find(
            ({ userId }) => userId === playerId,
          );
          if (userLeague === undefined) continue;

          const { freeChombos } = userLeague;

          const { txns, chombos } = computeTransactions({
            playerId,
            matchId,
            playerPosition: i + 1,
            leagueId,
            time,
            chombos: players[i].chombos,
            freeChombos,
            chomboDelta,
            rawScore: scores[i],
            returnPts: match.ruleset.returnPts,
            uma,
            ...placements[i],
          });

          await tx.userLeagueTransaction.createMany({ data: txns });

          if (freeChombos && freeChombos > 0 && chombos > 0) {
            await tx.userLeague.update({
              where: { leagueId_userId: { leagueId, userId: playerId } },
              data: {
                freeChombos: Math.max(0, freeChombos - chombos),
              },
            });
          }
        }

        return leagueId;
      });

      if (leagueId !== undefined) markStale(leagueId);
    }),

  getCompletedByLeague: publicProcedure
    .input(z.number())
    .query(async ({ input: leagueId, ctx }) => {
      const userGroups = await cachedGetUserGroups(ctx.session?.user?.id);
      const matches = await prisma.match.findMany({
        include: matchIncludes,
        where: {
          parent: { parentId: leagueId },
          status: Status.COMPLETE,
        },
        orderBy: { time: 'desc' },
      });
      return {
        matches: matches.map(({ players, ...matchOther }) => ({
          players: players.map((player) => {
            const { placementMin, placementMax, rawScore, ...playerOther } =
              transformMatchPlayer(player, userGroups);
            return {
              placementMin: assertNonNull(placementMin, 'placementMin'),
              placementMax: assertNonNull(placementMax, 'placementMax'),
              rawScore: assertNonNull(rawScore, 'rawScore'),
              ...playerOther,
            };
          }),
          ...matchOther,
        })),
      };
    }),

  getIncompleteByEvent: publicProcedure
    .input(z.number())
    .query(async ({ input: eventId, ctx }) => {
      const userGroups = await cachedGetUserGroups(ctx.session?.user?.id);
      const matches: Match[] = await prisma.match.findMany({
        include: matchIncludes,
        where: { eventId, status: Status.PENDING },
        orderBy: { time: 'desc' },
      });
      return {
        matches: matches.map((match) => transformMatch(match, userGroups)),
      };
    }),
});

export default matchRouter;
