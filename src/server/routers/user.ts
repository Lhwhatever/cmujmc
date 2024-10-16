import { publicProcedure, router } from '../trpc';
import { z } from 'zod';

const userRouter = router({
  create: publicProcedure
    // TODO: require user be admin
    .input(z.object({
      username: z.string(),
      admin: z.boolean(),
    }))
    .mutation(async (opts) => {
  }),
});

export default userRouter;