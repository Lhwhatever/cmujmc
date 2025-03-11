import makeValkey from './makeValkey';
import { prisma } from '../prisma';
import { User, userSelector } from '../../utils/usernames';
import superjson from 'superjson';
import Valkey from 'iovalkey';

const valkey = makeValkey(`users`);
const sharedV = valkey();

const key = 'names';
const ttl = 3 * 60 * 60; // 3 hours

export interface CachedGetUsersResult {
  nextCursor: string;
  users: User[];
}

const cachedGetUserPage = async (
  v: Valkey,
  cursor: string,
): Promise<CachedGetUsersResult> => {
  if (await v.expire(key, ttl)) {
    const [nextCursor, elements] = await v.hscan(key, cursor);
    return {
      nextCursor,
      users: elements
        .filter((_, index) => index % 2 == 1)
        .map((elem) => superjson.parse<User>(elem)),
    };
  }

  const users = await prisma.user.findMany(userSelector);
  await v.hmset(
    key,
    users.flatMap((user) => [user.id, superjson.stringify(user)]),
  );
  await v.expire(key, ttl);
  return {
    nextCursor: '0',
    users,
  };
};

export const cachedGetUsersPaginated = async (
  cursor: string | null | undefined,
): Promise<CachedGetUsersResult> => {
  return cachedGetUserPage(sharedV, cursor ?? '0');
};

export const cachedGetUsers = async (): Promise<User[]> => {
  const v = valkey();
  const users: User[] = [];
  let cursor = '0';
  do {
    const result = await cachedGetUserPage(v, cursor);
    cursor = result.nextCursor;
    users.push(...result.users);
  } while (cursor !== '0');
  await v.quit();
  return users;
};

export const invalidateUserCache = async (v?: Valkey): Promise<void> => {
  await (v ?? sharedV).del(key);
};
