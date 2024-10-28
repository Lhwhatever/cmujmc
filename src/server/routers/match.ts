import {
  authedProcedure,
  publicProcedure,
  router,
  throwUnauthorized,
} from '../trpc';
import schema from '../../protocol/schema';
import { prisma } from '../prisma';
import { NotFoundError } from '../../protocol/errors';
import { GameMode, Prisma, Status, TransactionType } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { getNumPlayers } from '../../utils/gameModes';
import { z } from 'zod';
import { computePts, sumTableScores } from '../../utils/scoring';

const validatePlayers = async (
  players: z.infer<typeof schema.match.create>['players'],
  gameMode: GameMode,
  requesterRole: 'admin' | 'user',
  requesterId: string,
) => {
  let hasSubmittingPlayer = false;
  let registeredPlayers = new Set();
  let unregisteredPlayers = new Set();

  for (const player of players) {
    switch (player.type) {
      case 'unregistered':
        unregisteredPlayers = unregisteredPlayers.add(player.payload);
        break;
      case 'registered':
        const id = player.payload;
        const user = await prisma.user.findUnique({ where: { id } });
        if (user === null) {
          throw new NotFoundError('user', id);
        }
        registeredPlayers = registeredPlayers.add(id);
        hasSubmittingPlayer = hasSubmittingPlayer || id === requesterId;
        break;
    }
  }

  if (requesterRole !== 'admin' && !hasSubmittingPlayer) {
    throwUnauthorized();
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

const matchSelector = Prisma.validator<Prisma.MatchSelect>()({
  status: true,
  players: { select: { playerId: true, txns: true } },
  parent: { select: { parent: { select: { id: true } } } },
  ruleset: {
    select: {
      startPts: true,
      returnPts: true,
      chomboDelta: true,
      uma: { select: { value: true }, orderBy: { position: 'asc' } },
    },
  },
});

const validateInRecord = (
  match: Prisma.MatchGetPayload<{ select: typeof matchSelector }>,
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
    throwUnauthorized();
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

const matchRouter = router({
  create: authedProcedure
    .input(schema.match.create)
    .mutation(async ({ ctx, input }) => {
      const event = await prisma.event.findUnique({
        where: { id: input.eventId },
        select: { ruleset: { select: { id: true, gameMode: true } } },
      });

      if (event === null) {
        throw new NotFoundError('event', input.eventId);
      }

      await validatePlayers(
        input.players,
        event.ruleset.gameMode,
        ctx.user.role,
        ctx.user.id,
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
        include: {
          players: {
            include: { player: true },
            orderBy: { playerPosition: 'asc' },
          },
          ruleset: true,
        },
      });

      return { match };
    }),

  getById: publicProcedure.input(z.number()).query(async ({ input }) => {
    const match = await prisma.match.findUnique({
      where: { id: input },
      include: {
        players: {
          include: { player: true },
          orderBy: { playerPosition: 'asc' },
        },
        ruleset: true,
      },
    });
    return { match };
  }),

  record: authedProcedure
    .input(schema.match.record)
    .mutation(({ ctx, input }) =>
      prisma.$transaction(async (tx) => {
        const { matchId, players } = input;
        const match = await tx.match.findUnique({
          where: { id: matchId },
          select: matchSelector,
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
        const uma = match.ruleset.uma.map(({ value }) => value);
        const results = computePts(scores, match.ruleset.returnPts, uma);

        await tx.match.update({
          where: { id: matchId },
          data: { status: Status.COMPLETE, time },
        });

        for (let i = 0; i < results.length; ++i) {
          const { pt: _, ...data } = results[i];
          await tx.userMatch.update({
            where: {
              matchId_playerPosition: { matchId, playerPosition: i + 1 },
            },
            data: {
              ...data,
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

        for (let i = 0; i < results.length; ++i) {
          const { playerId } = match.players[i];

          // only for registered players
          if (playerId === null) continue;
          const userLeague = userLeagues.find(
            ({ userId }) => userId === playerId,
          );
          if (userLeague === undefined) continue;

          await tx.userLeagueTransaction.create({
            data: {
              type: TransactionType.MATCH_RESULT,
              userId: playerId,
              leagueId,
              delta: results[i].pt,
              time,
              userMatchMatchId: matchId,
              userMatchPlayerPosition: i + 1,
            },
          });

          const { chombos } = players[i];
          const { freeChombos } = userLeague;

          await tx.userLeagueTransaction.createMany({
            data: chombos.map((description, index) => ({
              type: TransactionType.CHOMBO,
              userId: playerId,
              leagueId,
              delta: index < (freeChombos ?? 0) ? 0 : chomboDelta,
              time,
              description,
              userMatchMatchId: matchId,
              userMatchPlayerPosition: i + 1,
            })),
          });

          if (freeChombos && freeChombos > 0 && chombos.length > 0) {
            await tx.userLeague.update({
              where: { leagueId_userId: { leagueId, userId: playerId } },
              data: {
                freeChombos: Math.max(0, freeChombos - chombos.length),
              },
            });
          }
        }
      }),
    ),

  getCompletedByLeague: publicProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const matches = await prisma.match.findMany({
        where: {
          parent: { parentId: input },
          status: Status.COMPLETE,
        },
        orderBy: { time: 'desc' },
        include: {
          players: {
            include: { player: true },
            orderBy: { playerPosition: 'asc' },
          },
        },
      });
      return { matches };
    }),
});

export default matchRouter;
