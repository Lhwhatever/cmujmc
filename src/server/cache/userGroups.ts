import { getUserGroups, UserGroups } from '../../utils/usernames';
import superjson from 'superjson';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { invalidateUserCache } from './users';
import { Duration } from './glide';
import { GlideClusterClient, TimeUnit } from '@valkey/valkey-glide';

const expiry: Duration = { unit: TimeUnit.UnixSeconds, count: 3 * 60 * 60 };

export const cachedGetUserGroups = async (
  cache: GlideClusterClient,
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
  cache: GlideClusterClient,
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
