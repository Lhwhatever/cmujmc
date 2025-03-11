import makeValkey from './makeValkey';
import { getUserGroups, UserGroups } from '../../utils/usernames';
import superjson from 'superjson';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { invalidateUserCache } from './users';

const valkey = makeValkey(`userGroups`);
const sharedV = valkey();

const ttl = 3 * 60 * 60; // 3 hours

export const cachedGetUserGroups = async (
  userId?: string | null,
): Promise<UserGroups> => {
  if (userId === null || userId === undefined) {
    return getUserGroups(null);
  }

  const cachedValue = await sharedV.getex(userId, 'EX', ttl);
  if (cachedValue !== null) return superjson.parse<UserGroups>(cachedValue);

  const value = await getUserGroups(userId);
  await sharedV.setex(userId, ttl, superjson.stringify(value));
  return value;
};

export const updateUserInvalidateCache = async <
  T extends Omit<Prisma.Args<typeof prisma.user, 'update'>, 'where'>,
>(
  id: string,
  args: T,
) => {
  const result = prisma.user.update({
    ...args,
    where: { id },
  });
  await sharedV.del(id);
  await invalidateUserCache(sharedV);
  return result;
};
