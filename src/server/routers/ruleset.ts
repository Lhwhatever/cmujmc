import { publicProcedure, router } from '../trpc';
import { prisma } from '../prisma';

const rulesetRouter = router({
  listAll: publicProcedure.query(async () => {
    const rulesets = await prisma.ruleset.findMany({
      include: { uma: { select: { position: true, value: true } } },
    });
    return { rulesets };
  }),
});

export default rulesetRouter;
