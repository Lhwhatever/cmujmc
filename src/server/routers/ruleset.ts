import { publicProcedure, router } from '../trpc';
import { prisma } from '../prisma';
import { z } from 'zod';

const rulesetRouter = router({
  list: publicProcedure.input(z.string().optional()).query(async (opts) => {
    const where = opts.input ? undefined : { name: { contains: opts.input } };
    const rulesets = await prisma.ruleset.findMany({
      where,
      include: { uma: { select: { position: true, value: true } } },
    });
    return { rulesets };
  }),
});

export default rulesetRouter;
