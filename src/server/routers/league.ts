import { adminProcedure, publicProcedure, router } from '../trpc';
import { prisma } from '../prisma';
import { TRPCError } from '@trpc/server';
import schema from '../../protocol/schema';
import { computeClosingDate } from './events';
import { isBefore } from 'date-fns';

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
      include: { defaultRuleset: true },
    });
    if (league === null) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No league with ID ${id}`,
      });
    }
    return { league };
  }),
});

export default leagueRouter;
