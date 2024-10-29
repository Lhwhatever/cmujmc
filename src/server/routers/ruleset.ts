import { publicProcedure, router } from '../trpc';
import { prisma } from '../prisma';
import { z } from 'zod';
import { umaSelector, umaSerializer } from '../../utils/scoring';

const rulesetRouter = router({
  list: publicProcedure.input(z.string().optional()).query(async (opts) => {
    const where = opts.input ? undefined : { name: { contains: opts.input } };
    const rulesets = await prisma.ruleset.findMany({
      where,
      include: {
        uma: umaSelector,
      },
    });
    return {
      rulesets: rulesets.map(({ uma, ...rest }) => ({
        ...rest,
        uma: umaSerializer(uma),
      })),
    };
  }),
});

export default rulesetRouter;
