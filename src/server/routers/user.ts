import { adminProcedure, router } from '../trpc';
import { prisma } from '../prisma';

const userRouter = router({
  listAll: adminProcedure
    .query(async () => {
      const users = await prisma.user.findMany({});
      return { users };
    }),
});

export default userRouter;