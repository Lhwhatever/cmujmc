import { publicProcedure, router } from '../trpc';
import { prisma } from '../prisma';

const leagueRouter = router({
  list: publicProcedure.query(() =>
    prisma.league.findMany()
  ),
});

export default leagueRouter;