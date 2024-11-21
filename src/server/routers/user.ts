import { authedProcedure, publicProcedure, router } from '../trpc';
import { prisma } from '../prisma';
import {
  coalesceNames,
  getUserGroups,
  maskNames,
  userSelector,
} from '../../utils/usernames';
import schema from '../../protocol/schema';

const processPartialField = (s?: string) => (s === '' ? null : s);

const userRouter = router({
  listAll: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;
    const userGroups = await getUserGroups(userId);
    const users = await prisma.user.findMany(userSelector);
    return {
      users: users.map((user) => maskNames(coalesceNames(user), userGroups)),
    };
  }),

  self: authedProcedure.query(async ({ ctx }) => {
    const self = await prisma.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
    });
    return { self };
  }),

  updateProfile: authedProcedure
    .input(schema.user.updateProfile)
    .mutation(async ({ input, ctx }) => {
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          name: processPartialField(input.name),
          displayName: processPartialField(input.displayName),
        },
      });
    }),
});

export default userRouter;
