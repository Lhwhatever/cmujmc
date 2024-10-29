import {
  adminProcedure,
  authedProcedure,
  publicProcedure,
  router,
  throwUnauthorized,
} from '../trpc';
import { prisma } from '../prisma';
import { TRPCError } from '@trpc/server';
import schema from '../../protocol/schema';
import { computeClosingDate } from './events';
import { isBefore } from 'date-fns';
import { NotFoundError } from 'protocol/errors';
import { Status, TransactionType } from '@prisma/client';
import { computePlayerPt } from '../../utils/scoring';
import {
  getUserGroups,
  getUserSelector,
  User,
  maskNames,
  coalesceNames,
  NameCoalesced,
} from '../../utils/maskNames';
import {
  aggregateTxns,
  orderUnrankedUsers,
  rankUsers,
  TxnAggregate,
  txnsSelector,
} from '../../utils/ranking';
import { createCache } from 'cache-manager';

type UserLeagueRecord = {
  user: NameCoalesced<User>;
  agg: TxnAggregate;
  softPenalty: boolean;
};

const leaderboardCache = createCache();

const getCacheKey = (leagueId: number) => `league.${leagueId}`;

export const invalidateLeaderboardCache = (leagueId: number) =>
  leaderboardCache.del(getCacheKey(leagueId));

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

  get: publicProcedure.input(schema.league.get).query(async (opts) => {
    const id = opts.input;
    const league = await prisma.league.findUnique({
      where: { id },
      include: { defaultRuleset: true, users: true },
    });
    if (league === null) {
      throw new NotFoundError('league', id);
    }

    const user = opts.ctx.session?.user?.id;

    return {
      league,
      registered:
        user !== undefined
          ? league.users.some(({ userId }) => userId === user)
          : false,
    };
  }),

  register: authedProcedure
    .input(schema.league.register)
    .mutation(({ input, ctx }) => {
      const { leagueId } = input;
      return prisma.$transaction(async (tx) => {
        const league = await tx.league.findUnique({
          where: { id: leagueId },
          include: { users: { where: { userId: ctx.user.id }, take: 1 } },
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
          throwUnauthorized();
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
                    uma: {
                      select: { value: true },
                      orderBy: { position: 'asc' },
                    },
                  },
                },
              },
            },
          },
        });

        await tx.userLeague.create({
          data: {
            user: { connect: { id: ctx.user.id } },
            league: { connect: { id: leagueId } },
            txns: {
              createMany: {
                data: [
                  {
                    type: TransactionType.INITIAL,
                    delta: league.startingPoints,
                  },
                  ...matches.flatMap(
                    ({
                      match,
                      matchId,
                      playerPosition,
                      placementMin,
                      placementMax,
                      rawScore,
                      chombos,
                    }) => {
                      const uma = match.ruleset.uma.map(({ value }) => value);
                      const { time } = match;
                      return [
                        {
                          type: TransactionType.MATCH_RESULT,
                          time,
                          delta: computePlayerPt(
                            rawScore!,
                            match.ruleset.returnPts,
                            placementMin!,
                            placementMax!,
                            uma,
                          ),
                          userMatchMatchId: matchId,
                          userMatchPlayerPosition: playerPosition,
                        },
                        ...new Array(chombos!).map(() => ({
                          type: TransactionType.CHOMBO,
                          time,
                          delta: match.ruleset.chomboDelta,
                          userMatchMatchId: matchId,
                          userMatchPlayerPosition: playerPosition,
                        })),
                      ];
                    },
                  ),
                ],
              },
            },
          },
        });
      });
    }),

  leaderboard: publicProcedure
    .input(schema.league.leaderboard)
    .query(async ({ input, ctx }) => {
      const { leagueId } = input;

      const { rankedUsers, unrankedUsers } = await leaderboardCache.wrap(
        getCacheKey(leagueId),
        async () => {
          const users = await prisma.userLeague.findMany({
            where: { leagueId },
            include: {
              user: getUserSelector({ cmu: true, discord: true }),
              txns: txnsSelector,
              league: {
                select: {
                  matchesRequired: true,
                },
              },
            },
          });

          const rankedUsers: UserLeagueRecord[] = [];
          const unrankedUsers: UserLeagueRecord[] = [];

          for (const { user, txns, league, freeChombos } of users) {
            const agg = aggregateTxns(txns);
            const record = {
              user: coalesceNames(user),
              agg,
              softPenalty: freeChombos !== null,
            };
            if (agg.numMatches >= league.matchesRequired) {
              rankedUsers.push(record);
            } else {
              unrankedUsers.push(record);
            }
          }

          return {
            rankedUsers: rankUsers(leagueId, rankedUsers),
            unrankedUsers: orderUnrankedUsers(unrankedUsers),
          };
        },
        600,
      );

      const userGroups = await getUserGroups(ctx.session?.user?.id);
      return {
        rankedUsers: rankedUsers.map(({ user, ...rest }) => ({
          user: maskNames(user, userGroups),
          ...rest,
        })),
        unrankedUsers: unrankedUsers.map(({ user, ...rest }) => ({
          user: maskNames(user, userGroups),
          ...rest,
        })),
      };
    }),
});

export default leagueRouter;
