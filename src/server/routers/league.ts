import {
  adminProcedure,
  authedProcedure,
  AuthorizationError,
  publicProcedure,
  router,
} from '../trpc';
import { prisma } from '../prisma';
import { TRPCError } from '@trpc/server';
import schema from '../../protocol/schema';
import { NotFoundError } from '../../protocol/errors';
import { computeClosingDate } from './events';
import { isBefore } from 'date-fns';
import { Prisma, Status, TransactionType } from '@prisma/client';
import { computeTransactions, umaSelector } from '../../utils/scoring';
import { maskNames, userSelector, coalesceNames } from '../../utils/usernames';
import { z } from 'zod';
import assertNonNull from '../../utils/nullcheck';
import { cachedGetUserGroups } from '../cache/userGroups';
import {
  cachedGetLeaderboard,
  getLastLeaderboardUpdate,
  updateLeaderboardEntries,
} from '../cache/leaderboard';
import { cachedGetUsers } from '../cache/users';
import { aggregateTxnArray, txnsSelector } from '../../utils/ranking';

const leagueRouter = router({
  list: publicProcedure.query(async () => {
    const leagues = await prisma.league.findMany({
      include: {
        defaultRuleset: {
          select: { name: true },
        },
      },
    });
    return { leagues };
  }),

  create: adminProcedure.input(schema.league.create).mutation(async (opts) => {
    const {
      startDate,
      endDate,
      name,
      description,
      invitational,
      defaultRulesetId,
      startingPoints,
      singleEvent,
      matchesRequired,
      softPenaltyCutoff,
    } = opts.input;

    if (startDate && endDate && !isBefore(startDate, endDate)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `startDate ${startDate.toISOString()} must be strictly before endDate ${endDate.toISOString()} `,
      });
    }

    return prisma.league.create({
      data: {
        name,
        description,
        invitational,
        defaultRuleset: {
          connect: { id: defaultRulesetId },
        },
        matchesRequired,
        softPenaltyCutoff,
        startingPoints,
        startDate,
        endDate,
        events: singleEvent
          ? {
              create: [
                {
                  startDate,
                  endDate,
                  closingDate: computeClosingDate(endDate),
                  ruleset: { connect: { id: defaultRulesetId } },
                },
              ],
            }
          : undefined,
      },
    });
  }),

  get: publicProcedure
    .input(schema.league.get)
    .query(async ({ input: id, ctx }) => {
      const userFilter = ctx.session
        ? Prisma.validator<Prisma.League$usersArgs>()({
            where: { userId: ctx.session.user.id },
          })
        : undefined;

      const league = await prisma.league.findUnique({
        where: { id },
        include: {
          defaultRuleset: true,
          users: userFilter,
        },
      });

      if (league === null) {
        throw new NotFoundError('league', id);
      }

      const { users, ...rest } = league;
      const userInfo = users.length > 0 ? users[0] : null;
      return { league: rest, userInfo };
    }),

  register: authedProcedure
    .input(schema.league.register)
    .mutation(async ({ input, ctx }) => {
      const { leagueId } = input;
      const txnResult = await prisma.$transaction(async (tx) => {
        const league = await tx.league.findUnique({
          where: { id: leagueId },
          select: {
            users: { where: { userId: ctx.user.id }, take: 1 },
            invitational: true,
            startingPoints: true,
            matchesRequired: true,
          },
        });

        if (league === null) {
          throw new NotFoundError<number>('league', leagueId);
        }

        if (league.users.length > 0) {
          throw new TRPCError({
            message: 'Already registered',
            code: 'BAD_REQUEST',
          });
        }

        if (league.invitational) {
          new AuthorizationError({
            user: ctx.user,
            reason: 'Cannot self-register for invitational event.',
          }).logAndThrow();
        }

        const matches = await tx.userMatch.findMany({
          where: {
            playerId: ctx.user.id,
            match: {
              parent: { parentId: leagueId },
              status: Status.COMPLETE,
            },
          },
          include: {
            match: {
              select: {
                time: true,
                ruleset: {
                  select: {
                    returnPts: true,
                    chomboDelta: true,
                    uma: umaSelector,
                  },
                },
              },
            },
          },
        });

        const initialTxn: Prisma.UserLeagueTransactionCreateManyInput = {
          type: TransactionType.INITIAL,
          userId: ctx.user.id,
          leagueId,
          delta: league.startingPoints,
          time: new Date(),
        };

        const txns = matches.flatMap(
          ({
            matchId,
            playerPosition,
            match,
            chombos,
            rawScore,
            placementMin,
            placementMax,
          }) =>
            computeTransactions({
              playerId: ctx.user.id,
              matchId,
              playerPosition,
              leagueId,
              time: match.time,
              chombos: assertNonNull(chombos, 'chombos'),
              chomboDelta: match.ruleset.chomboDelta,
              returnPts: match.ruleset.returnPts,
              uma: match.ruleset.uma.map(({ value }) => value),
              rawScore: assertNonNull(rawScore, 'rawScore'),
              placementMin: assertNonNull(placementMin, 'placementMin'),
              placementMax: assertNonNull(placementMax, 'placementMax'),
            }).txns,
        );

        await tx.userLeague.create({
          data: {
            user: { connect: { id: ctx.user.id } },
            league: { connect: { id: leagueId } },
          },
        });

        return {
          matchesRequiredForRank: league.matchesRequired,
          aggregate: aggregateTxnArray(
            await tx.userLeagueTransaction.createManyAndReturn({
              data: [initialTxn, ...txns],
              select: txnsSelector.select,
            }),
          ),
        };
      });
      updateLeaderboardEntries(leagueId, txnResult.matchesRequiredForRank, [
        { userId: ctx.user.id, aggregate: txnResult.aggregate },
      ]);
    }),

  leaderboard: publicProcedure
    .input(schema.league.leaderboard)
    .query(async ({ input, ctx }) => {
      const { leagueId } = input;

      const usersPromise = cachedGetUsers();
      const userGroupsPromise = cachedGetUserGroups(ctx.session?.user?.id);
      const leaderboardPromise = cachedGetLeaderboard(leagueId);

      const users = await usersPromise;
      const usersById = new Map(users.map((user) => [user.id, user]));

      const userGroups = await userGroupsPromise;

      const { lastUpdated, entries } = await leaderboardPromise;
      return {
        lastUpdated,
        users: entries.map(({ userId, rank, agg }) => ({
          user: maskNames(
            coalesceNames(
              assertNonNull(usersById.get(userId) ?? null, 'userId'),
            ),
            userGroups,
          ),
          rank,
          agg,
        })),
      };
    }),

  isLeaderboardStale: publicProcedure
    .input(schema.league.isLeaderboardStale)
    .query(async ({ input }) => {
      const { leagueId, lastUpdated } = input;
      return (await getLastLeaderboardUpdate(leagueId)) !== lastUpdated;
    }),

  scoreHistory: authedProcedure
    .input(z.number())
    .query(async ({ input: leagueId, ctx }) => {
      const { id: userId } = ctx.user;

      const txns = await prisma.userLeagueTransaction.findMany({
        where: { leagueId, userId },
        include: {
          match: {
            include: {
              match: {
                include: {
                  players: {
                    include: {
                      player: userSelector,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          time: 'desc',
        },
      });

      const userGroups = await cachedGetUserGroups(userId);

      return {
        txns: txns.map((txn) => {
          const { type, delta, match: matchWrapper, ...txnOther } = txn;
          const protoResult = {
            delta: delta.toString(),
            ...txnOther,
          };

          switch (type) {
            case TransactionType.MATCH_RESULT: {
              const { players, ...matchOther } = assertNonNull(
                matchWrapper,
                'match',
              ).match;
              return {
                ...protoResult,
                type,
                match: {
                  ...matchOther,
                  userAt: players.findIndex(
                    ({ player }) => player?.id === userId,
                  ),
                  players: players.map(
                    ({ player, placementMin, placementMax, ...other }) => ({
                      ...other,
                      placementMin: assertNonNull(placementMin, 'placementMin'),
                      placementMax: assertNonNull(placementMax, 'placementMax'),
                      player: player
                        ? maskNames(coalesceNames(player), userGroups)
                        : null,
                    }),
                  ),
                },
              };
            }
            case TransactionType.INITIAL:
            case TransactionType.CHOMBO:
            case TransactionType.OTHER_MOD:
              return {
                ...protoResult,
                type,
                match: null,
              };
          }
        }),
      };
    }),
});

export default leagueRouter;
