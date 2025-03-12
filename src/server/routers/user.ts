import { authedProcedure, publicProcedure, router } from '../trpc';
import { prisma } from '../prisma';
import { coalesceNames, getUserGroups, maskNames } from '../../utils/usernames';
import schema from '../../protocol/schema';
import { updateUserInvalidateCache } from '../cache/userGroups';
import { cachedGetUsersPaginated } from '../cache/users';
import { withCache } from '../cache/glide';

const processPartialField = (s?: string) => (s === '' ? null : s);

const userRouter = router({
  listAll: publicProcedure
    .input(schema.user.listAll)
    .query(async ({ input, ctx }) => {
      const userId = ctx.session?.user?.id;
      const userGroups = await getUserGroups(userId);
      const { nextCursor, users } = await withCache((cache) =>
        cachedGetUsersPaginated(cache, input?.cursor),
      );
      return {
        nextCursor,
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
      await withCache((cache) =>
        updateUserInvalidateCache(cache, ctx.user.id, {
          select: {},
          data: {
            name: processPartialField(input.name),
            displayName: processPartialField(input.displayName),
          },
        }),
      );
    }),
});

export default userRouter;
