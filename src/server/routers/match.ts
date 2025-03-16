import {
  authedProcedure,
  AuthorizationError,
  publicProcedure,
  router,
} from '../trpc';
import schema from '../../protocol/schema';
import { prisma } from '../prisma';
import { NotFoundError } from '../../protocol/errors';
import { GameMode, Prisma, Status, TransactionType } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { getNumPlayers } from '../../utils/gameModes';
import { z } from 'zod';
import { computePlacements } from '../../utils/scoring';
import {
  coalesceNames,
  maskNames,
  UserGroups,
  userSelector,
} from '../../utils/usernames';
import { Session } from 'next-auth';
import { cachedGetUserGroups } from '../cache/userGroups';
import { recomputePlayersOnLeaderboard } from '../cache/leaderboard';
import { withCache } from '../cache/glide';
import {
  matchPlayerToPrisma,
  currMatchSelector,
  CurrentMatch,
} from '../scoreRecords/types';
import validateMatchScoreSum from '../scoreRecords/validateScores';
import regenerateTransactions from '../scoreRecords/regenerateTransactions';

//==================== for create ====================

const validateCreateMatchPlayers = async (
  time: Date | undefined,
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

  if (
    getNumPlayers(gameMode) !==
    registeredPlayers.size + unregisteredPlayers.size
  ) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Incorrect number of players',
    });
  }

  if (requester.role !== 'admin' && !hasSubmittingPlayer) {
    new AuthorizationError({
      reason:
        "You don't have the permission to record a match which you did not play in.",
    }).logAndThrow();
  }

  if (requester.role !== 'admin' && time !== undefined) {
    new AuthorizationError({
      reason: "You don't have the permission to specify an arbitrary time",
    }).logAndThrow();
  }
};

//==================== for record ====================

const checkEditMatchPermissions = (
  match: CurrentMatch,
  input: z.infer<typeof schema.match.editMatch>,
  requesterId: string,
): AuthorizationError | undefined => {
  if (match.status !== Status.PENDING) {
    return new AuthorizationError({
      reason: "You don't have the permissions to update a non-pending match.",
    });
  }

  if (input.players.some(({ player }) => player !== undefined)) {
    return new AuthorizationError({
      reason:
        "You don't have the permissions to edit the list of players in this match.",
    });
  }

  if (match.players.every(({ playerId }) => playerId !== requesterId)) {
    return new AuthorizationError({
      reason:
        "You don't have the permissions to record a match which you did not play in.",
    });
  }

  if (
    input.players.some(
      ({ chombos }) => chombos !== undefined && chombos.length > 0,
    )
  ) {
    return new AuthorizationError({
      reason: "You don't have the permissions to record chombos.",
    });
  }

  if (input.time !== undefined) {
    return new AuthorizationError({
      reason:
        "You don't have the permissions to set an arbitrary time for the match.",
    });
  }
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
      const userGroups = await withCache((cache) =>
        cachedGetUserGroups(cache, ctx.session?.user?.id),
      );
      const event = await prisma.event.findUnique({
        where: { id: input.eventId },
        select: {
          ruleset: { select: { id: true, gameMode: true, startPts: true } },
        },
      });

      if (event === null) {
        throw new NotFoundError('event', input.eventId);
      }

      await validateCreateMatchPlayers(
        input.time,
        input.players,
        event.ruleset.gameMode,
        ctx.user,
      );

      const match = await prisma.match.create({
        data: {
          status: Status.PENDING,
          time: input.time,
          ruleset: { connect: { id: event.ruleset.id } },
          parent: { connect: { id: input.eventId } },
          players: {
            createMany: {
              data: input.players.map((player, index) => ({
                playerPosition: index + 1,
                ...matchPlayerToPrisma(player),
                rawScore: event.ruleset.startPts,
                placementMin: 1,
                placementMax: input.players.length,
              })),
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
      const userGroups = await withCache((cache) =>
        cachedGetUserGroups(cache, ctx.session?.user?.id),
      );
      const match: Match | null = await prisma.match.findUnique({
        include: matchIncludes,
        where: { id },
      });
      if (match === null) {
        throw new NotFoundError('match', id);
      }
      return { match: transformMatch(match, userGroups) };
    }),

  getChombosOf: authedProcedure
    .input(z.number())
    .query(async ({ input: matchId, ctx }) => {
      const chombos = await prisma.userLeagueTransaction.findMany({
        where: { userMatchMatchId: matchId, type: TransactionType.CHOMBO },
        select: {
          time: true,
          description: true,
          userMatchMatchId: true,
          userMatchPlayerPosition: true,
        },
      });

      return {
        count: chombos.length,
        chombos: ctx.user.role === 'admin' ? chombos : undefined,
      };
    }),

  getCompletedByLeague: publicProcedure
    .input(z.number())
    .query(async ({ input: leagueId, ctx }) => {
      const userGroups = await withCache((cache) =>
        cachedGetUserGroups(cache, ctx.session?.user?.id),
      );
      const matches = await prisma.match.findMany({
        include: matchIncludes,
        where: {
          parent: { parentId: leagueId },
          status: Status.COMPLETE,
        },
        orderBy: { time: 'desc' },
      });
      return {
        matches: matches.map((match) => transformMatch(match, userGroups)),
      };
    }),

  getIncompleteByEvent: publicProcedure
    .input(z.number())
    .query(async ({ input: eventId, ctx }) => {
      const userGroups = await withCache((cache) =>
        cachedGetUserGroups(cache, ctx.session?.user?.id),
      );
      const matches: Match[] = await prisma.match.findMany({
        include: matchIncludes,
        where: { eventId, status: Status.PENDING },
        orderBy: { time: 'desc' },
      });
      return {
        matches: matches.map((match) => transformMatch(match, userGroups)),
      };
    }),

  editMatch: authedProcedure
    .input(schema.match.editMatch)
    .mutation(async ({ input, ctx }) => {
      await prisma.$transaction(async (tx) => {
        const currMatch = await tx.match.findUnique({
          where: { id: input.matchId },
          select: currMatchSelector,
        });

        if (currMatch === null) {
          throw new NotFoundError('match', input.matchId);
        }

        if (ctx.user.role !== 'admin' && input.commit) {
          const error = checkEditMatchPermissions(
            currMatch,
            input,
            ctx.user.id,
          );
          if (error) error.logAndThrow();
        }

        const scores = validateMatchScoreSum(currMatch.ruleset, input);

        // compute and update match, userMatch entries
        const time = input.time ?? new Date();
        const placements = computePlacements(scores);

        await tx.match.update({
          where: { id: input.matchId },
          data: { status: input.commit ? Status.COMPLETE : undefined, time },
        });

        const updatedUserMatches = await Promise.all(
          input.players.map(({ player, score }, i) =>
            tx.userMatch.update({
              where: {
                matchId_playerPosition: {
                  matchId: input.matchId,
                  playerPosition: i + 1,
                },
              },
              data: {
                ...placements[i],
                ...(player ? matchPlayerToPrisma(player) : {}),
                rawScore: score,
              },
            }),
          ),
        );

        if (!input.commit) return;

        // check if this is ranked
        const league = currMatch.parent?.parent;
        if (league === undefined) return;

        const affectedPlayers = await regenerateTransactions(tx, {
          leagueId: league.id,
          time,
          input,
          currMatch,
          updatedUserMatches,
          placements,
        });
        for (const { playerId } of currMatch.players) {
          if (playerId !== null) affectedPlayers.add(playerId);
        }

        await withCache((cache) =>
          recomputePlayersOnLeaderboard(
            cache,
            tx,
            league.id,
            league.matchesRequired,
            Array.from(affectedPlayers),
          ),
        );
      });
    }),
});

export default matchRouter;
