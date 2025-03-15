import { authedProcedure, publicProcedure, router } from '../trpc';
import { prisma } from '../prisma';
import { coalesceNames, maskNames } from '../../utils/usernames';
import schema from '../../protocol/schema';
import {
  cachedGetUserGroups,
  updateUserInvalidateCache,
} from '../cache/userGroups';
import { cachedGetUsersPaginated } from '../cache/users';
import { withCache } from '../cache/glide';

const processPartialField = (s?: string) => (s === '' ? null : s);

const userRouter = router({
  listAll: publicProcedure.input(schema.user.listAll).query(({ input, ctx }) =>
    withCache(async (cache) => {
      const userGroups = await cachedGetUserGroups(
        cache,
        ctx.session?.user?.id,
      );
      const { nextCursor, users } = await cachedGetUsersPaginated(
        cache,
        input?.cursor,
      );
      return {
        userGroups,
        nextCursor: nextCursor === '0' ? null : nextCursor,
        users: users.map((user) => maskNames(coalesceNames(user), userGroups)),
      };
    }),
  ),

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
          data: {
            name: processPartialField(input.name),
            displayName: processPartialField(input.displayName),
          },
        }),
      );
    }),
});

export default userRouter;
