import { publicProcedure, router } from '../trpc';
import { prisma } from '../prisma';

type UserGroups = {
  cmu: boolean;
  discord: boolean;
};

const getUserGroups = async (userId?: string): Promise<UserGroups> => {
  if (userId === undefined) return { cmu: false, discord: false };
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { admin: true, andrew: true, discord: true },
  });
  return {
    cmu: user.andrew !== null || user.admin,
    discord: user.discord !== null || user.admin,
  };
};

const userRouter = router({
  listAll: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;
    const userGroups = await getUserGroups(userId);
    const users = await prisma.user.findMany({
      select: {
        id: true,
        displayName: true,
        name: true,
        admin: true,
        andrew: userGroups.cmu,
        discord: userGroups.discord,
      },
    });
    return { users };
  }),
});

export default userRouter;
