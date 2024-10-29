import { publicProcedure, router } from '../trpc';
import { prisma } from '../prisma';
import {
  coalesceNames,
  getUserGroups,
  getUserSelector,
  maskNames,
} from '../../utils/maskNames';

const userRouter = router({
  listAll: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;
    const userGroups = await getUserGroups(userId);
    const users = await prisma.user.findMany(getUserSelector(userGroups));
    return {
      users: users.map((user) => maskNames(coalesceNames(user), userGroups)),
    };
  }),
});

export default userRouter;
