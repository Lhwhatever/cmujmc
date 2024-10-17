import { adminProcedure, publicProcedure, router } from '../trpc';
import { prisma } from '../prisma';
import { z } from 'zod';

const leagueRouter = router({
  list: publicProcedure.query(async () => {
    const leagues = await prisma.league.findMany();
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
        },
      }),
    ),
});

export default leagueRouter;
