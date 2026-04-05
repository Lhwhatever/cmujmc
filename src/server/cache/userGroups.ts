import { UserGroups } from '../../utils/usernames';

export const getUserGroups = async (
  userId?: string | null,
): Promise<UserGroups> => {
  if (userId === undefined || userId === null)
    return { cmu: false, discord: false };
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { admin: true, andrew: true, discord: true },
  });
  return {
    cmu: user.andrew !== null || user.admin,
    discord: user.discord !== null || user.admin,
  };
};
import superjson from 'superjson';
import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../prisma';
import { invalidateUserCache } from './users';
import { Duration } from './glide';
import { GlideClient, TimeUnit } from '@valkey/valkey-glide';

const expiry: Duration = { unit: TimeUnit.UnixSeconds, count: 3 * 60 * 60 };

export const cachedGetUserGroups = async (
  cache: GlideClient,
  userId?: string | null,
): Promise<UserGroups> => {
  if (userId === null || userId === undefined) {
    return getUserGroups(null);
  }

  const cachedValue = await cache.getex(userId, {
    expiry: {
      type: expiry.unit,
      duration: expiry.count,
    },
  });
  if (cachedValue !== null)
    return superjson.parse<UserGroups>(cachedValue as string);

  const value = await getUserGroups(userId);
  await cache.set(userId, superjson.stringify(value), {
    expiry: {
      type: expiry.unit,
      count: expiry.count,
    },
  });
  return value;
};

export const updateUserInvalidateCache = async <
  T extends Omit<Prisma.Args<typeof prisma.user, 'update'>, 'where'>,
>(
  cache: GlideClient,
  id: string,
  args: T,
) => {
  const result = prisma.user.update({
    ...args,
    where: { id },
  });
  await cache.del([id]);
  await invalidateUserCache(cache);
  return result;
};
