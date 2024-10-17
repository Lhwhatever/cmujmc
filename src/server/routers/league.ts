import { adminProcedure, publicProcedure, router } from '../trpc';
import { prisma } from '../prisma';
import { z } from 'zod';
import * as Schema from '../../protocol/league';
import { TRPCError } from '@trpc/server';

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

  create: adminProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string(),
        invitational: z.boolean(),
        defaultRulesetId: z.number().int(),
        startingPoints: z.number().step(0.1),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .mutation(async (opts) =>
      prisma.league.create({
        data: {
          name: opts.input.name,
          description: opts.input.description,
          invitational: opts.input.invitational,
          defaultRuleset: {
            connect: { id: opts.input.defaultRulesetId },
          },
          startingPoints: opts.input.startingPoints,
          startDate: opts.input.startDate,
          endDate: opts.input.endDate,
        },
      }),
    ),

  get: publicProcedure.input(Schema.get).query(async (opts) => {
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
