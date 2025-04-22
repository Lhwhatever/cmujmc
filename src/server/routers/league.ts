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
import { Prisma, TransactionType } from '@prisma/client';
import { maskNames, userSelector, coalesceNames } from '../../utils/usernames';
import { z } from 'zod';
import assertNonNull from '../../utils/nullcheck';
import { cachedGetUserGroups } from '../cache/userGroups';
import {
  cachedGetLeaderboard,
  getLastLeaderboardUpdate,
  recomputePlayersOnLeaderboard,
} from '../cache/leaderboard';
import { cachedGetUsers } from '../cache/users';
import { withCache } from '../cache/glide';

const leagueRouter = router({
  list: publicProcedure.input(schema.league.list).query(async ({ input }) => {
    let leagues = await prisma.league.findMany({
      include: {
        defaultRuleset: {
          select: { name: true },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: {
        endDate: Prisma.SortOrder.desc,
      },
      where: input?.filter && {
        endDate: input.filter.endDate,
      },
    });

    if (input?.filter?.minUsers !== undefined) {
      const { minUsers } = input.filter;
      leagues = leagues.filter(({ _count }) => _count.users > minUsers);
    }

    if (input?.limit !== undefined) {
      leagues = leagues.slice(0, input.limit);
    }

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
        softPenaltyCutoff: 0,
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

      const league = await prisma.league.findUniqueOrThrow({
        where: { id },
        include: {
          defaultRuleset: true,
          users: userFilter,
        },
      });

      const { users, ...rest } = league;
      const userInfo = users?.at(0);
      return { league: rest, userInfo };
    }),

  register: authedProcedure
    .input(schema.league.register)
    .mutation(({ input, ctx }) =>
      prisma.$transaction(async (tx) => {
        const { leagueId } = input;
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

        await tx.userLeague.create({
          data: {
            user: { connect: { id: ctx.user.id } },
            league: { connect: { id: leagueId } },
          },
        });

        await tx.userLeagueTransaction.create({
          data: {
            type: TransactionType.INITIAL,
            userId: ctx.user.id,
            leagueId,
            delta: league.startingPoints,
            time: new Date(),
          },
        });

        await withCache((cache) =>
          recomputePlayersOnLeaderboard(
            cache,
            tx,
            leagueId,
            league.matchesRequired,
            [ctx.user.id],
          ),
        );
      }),
    ),

  leaderboard: publicProcedure
    .input(schema.league.leaderboard)
    .query(async ({ input, ctx }) => {
      const { leagueId } = input;

      const [users, userGroups, { lastUpdated, entries }] = await withCache(
        async (cache) => {
          const users = cachedGetUsers(cache);
          const userGroups = cachedGetUserGroups(cache, ctx.session?.user?.id);
          const leaderboard = cachedGetLeaderboard(cache, leagueId);

          return [
            new Map((await users).map((user) => [user.id, user])),
            await userGroups,
            await leaderboard,
          ];
        },
      );

      return {
        lastUpdated,
        users: entries.map(({ userId, rank, agg }) => ({
          user: maskNames(
            coalesceNames(assertNonNull(users.get(userId) ?? null, 'userId')),
            userGroups,
          ),
          rank,
          agg,
        })),
      };
    }),

  lastLeaderboardUpdate: publicProcedure
    .input(schema.league.lastLeaderboardUpdate)
    .query(async ({ input }) => {
      const { leagueId } = input;
      return withCache((cache) => getLastLeaderboardUpdate(cache, leagueId));
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

      const userGroups = await withCache((cache) =>
        cachedGetUserGroups(cache, userId),
      );

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
                  players: players.map(({ player, ...other }) => ({
                    ...other,
                    player: player
                      ? maskNames(coalesceNames(player), userGroups)
                      : null,
                  })),
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
