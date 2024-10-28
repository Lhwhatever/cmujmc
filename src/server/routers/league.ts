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
import { TransactionType } from '@prisma/client';

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
      registered: user && league.users.some(({ userId }) => userId === user),
    };
  }),

  register: authedProcedure
    .input(schema.league.register)
    .mutation(async (opts) => {
      const { leagueId } = opts.input;
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
      });

      if (league === null) {
        throw new NotFoundError<number>('league', leagueId);
      }

      if (league.invitational) {
        throwUnauthorized();
      }

      return prisma.userLeague.create({
        data: {
          user: { connect: { id: opts.ctx.user.id } },
          league: { connect: { id: leagueId } },
          txns: {
            create: {
              type: TransactionType.INITIAL,
              delta: league.startingPoints,
            },
          },
        },
      });
    }),
});

export default leagueRouter;
