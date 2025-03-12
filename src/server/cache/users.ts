import { prisma } from '../prisma';
import { User, userSelector } from '../../utils/usernames';
import superjson from 'superjson';
import { composeKey } from './glide';
import { GlideClusterClient } from '@valkey/valkey-glide';

const keyPath = composeKey(['user', 'names']);

const ttl = 3 * 60 * 60; // 3 hours

export interface CachedGetUsersResult {
  nextCursor: string;
  users: User[];
}

const cachedGetUserPage = async (
  cache: GlideClusterClient,
  cursor: string,
): Promise<CachedGetUsersResult> => {
  if (await cache.expire(keyPath, ttl)) {
    const [nextCursor, elements] = await cache.hscan(keyPath, cursor);
    return {
      nextCursor,
      users: elements
        .filter((_, index) => index % 2 === 1)
        .map((elem) => {
          return superjson.parse<User>(elem as string);
        }),
    };
  }

  const users = await prisma.user.findMany(userSelector);
  const userById: Record<string, string> = {};
  for (const user of users) {
    userById[user.id] = superjson.stringify(user);
  }
  await cache.hset(keyPath, userById);
  await cache.expire(keyPath, ttl);
  return {
    nextCursor: '0',
    users,
  };
};

export const cachedGetUsersPaginated = async (
  cache: GlideClusterClient,
  cursor: string | null | undefined,
): Promise<CachedGetUsersResult> => {
  return cachedGetUserPage(cache, cursor ?? '0');
};

export const cachedGetUsers = async (
  cache: GlideClusterClient,
): Promise<User[]> => {
  const users: User[] = [];
  let cursor = '0';
  do {
    const result = await cachedGetUserPage(cache, cursor);
    cursor = result.nextCursor;
    users.push(...result.users);
  } while (cursor !== '0');
  return users;
};

export const invalidateUserCache = async (
  cache: GlideClusterClient,
): Promise<void> => {
  await cache.del([keyPath]);
};
