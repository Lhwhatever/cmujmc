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
import { NotFoundError } from '../../protocol/errors';
import { computeClosingDate } from './events';
import { isBefore } from 'date-fns';
import { Prisma, Status, TransactionType } from '@prisma/client';
import { computeTransactions, umaSelector } from '../../utils/scoring';
import {
  getUserGroups,
  User,
  maskNames,
  NameCoalesced,
  userSelector,
} from '../../utils/usernames';
import { Ranked, TxnAggregate } from '../../utils/ranking';
import Decimal from 'decimal.js';
import { z } from 'zod';
import { getLeaderboard } from '../leaderboard/leaderboard';
import { markStale } from '../leaderboard/worker';

type UserLeagueRecord = {
  user: NameCoalesced<User>;
  agg: TxnAggregate;
  softPenalty: boolean;
};

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
      const userInfo = users ? (users.length > 0 ? users[0] : null) : null;
      return { league: rest, userInfo };
    }),

  register: authedProcedure
    .input(schema.league.register)
    .mutation(async ({ input, ctx }) => {
      const { leagueId } = input;
      await prisma.$transaction(async (tx) => {
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
              chombos: chombos!,
              freeChombos: null,
              chomboDelta: match.ruleset.chomboDelta,
              returnPts: match.ruleset.returnPts,
              uma: match.ruleset.uma.map(({ value }) => value),
              rawScore: rawScore!,
              placementMin: placementMin!,
              placementMax: placementMax!,
            }).txns,
        );

        await tx.userLeague.create({
          data: {
            user: { connect: { id: ctx.user.id } },
            league: { connect: { id: leagueId } },
          },
        });

        await tx.userLeagueTransaction.createMany({
          data: [initialTxn, ...txns],
        });
      });
      markStale(leagueId);
    }),

  leaderboard: publicProcedure
    .input(schema.league.leaderboard)
    .query(async ({ input, ctx }) => {
      const { leagueId } = input;
      const { lastUpdated, rankedUsers, unrankedUsers } = await getLeaderboard(
        leagueId,
      );

      const userGroups = await getUserGroups(ctx.session?.user?.id);
      return {
        lastUpdated: new Date(lastUpdated).toISOString(),
        rankedUsers: rankedUsers.map(
          ({ user, ...rest }: Ranked<UserLeagueRecord>) => ({
            user: maskNames(user, userGroups),
            ...rest,
          }),
        ),
        unrankedUsers: unrankedUsers.map(
          ({ user, ...rest }: UserLeagueRecord) => ({
            user: maskNames(user, userGroups),
            ...rest,
          }),
        ),
      };
    }),

  softerPenalty: authedProcedure
    .input(schema.league.softenPenalty)
    .mutation(async ({ input, ctx }) => {
      const { leagueId } = input;
      const { id: userId } = ctx.user;
      await prisma.$transaction(async (tx) => {
        const userLeague = await tx.userLeague.findUnique({
          where: { leagueId_userId: { leagueId, userId } },
          include: {
            league: { select: { softPenaltyCutoff: true } },
            txns: { orderBy: { time: 'asc' } },
          },
        });

        if (userLeague === null) {
          throw new NotFoundError('userLeague', `${userId}:${leagueId}`);
        }

        if (userLeague.freeChombos !== null) {
          throw new TRPCError({
            message: 'Already softer penalty',
            code: 'BAD_REQUEST',
          });
        }

        const numMatches = userLeague.txns.reduce(
          (count, { type }) =>
            count + (type === TransactionType.MATCH_RESULT ? 1 : 0),
          0,
        );

        if (numMatches >= userLeague.league.softPenaltyCutoff) {
          throw new TRPCError({
            message: 'Played too many games to apply softer penalty',
            code: 'BAD_REQUEST',
          });
        }

        const chombosFreed: string[] = [];
        let chomboAllowance = 3;
        for (const { id, type } of userLeague.txns) {
          if (type === TransactionType.CHOMBO) {
            chombosFreed.push(id);
            if (--chomboAllowance == 0) break;
          }
        }

        await tx.userLeague.update({
          where: { leagueId_userId: { leagueId, userId } },
          data: {
            freeChombos: chomboAllowance,
            txns: {
              updateMany: {
                where: { id: { in: chombosFreed } },
                data: { delta: new Decimal(0) },
              },
            },
          },
        });
      });
      markStale(leagueId);
    }),

  scoreHistory: authedProcedure
    .input(z.number())
    .query(async ({ input: leagueId, ctx }) => {
      const { id: userId } = ctx.user;
      const txns = await prisma.userLeagueTransaction.findMany({
        where: { leagueId, userId },
        include: {
          match: {
            select: {
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
      });

      const userGroups = await getUserGroups(userId);

      return {
        txns: txns.map(({ delta, match: matchWrapper, ...other }) => {
          const match = matchWrapper?.match
            ? {
                ...matchWrapper.match,
                players: matchWrapper.match.players.map(
                  ({ player, ...other }) => ({
                    ...other,
                    player: player ? maskNames(player, userGroups) : null,
                  }),
                ),
              }
            : null;

          return {
            ...other,
            match,
            delta: delta.toString(),
          };
        }),
      };
    }),
});

export default leagueRouter;
