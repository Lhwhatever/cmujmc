import makeValkey from './makeValkey';
import { prisma } from '../prisma';
import { User, userSelector } from '../../utils/usernames';
import superjson from 'superjson';

const valkey = makeValkey(`users`);

const key = 'names';
const ttl = 3 * 60 * 60; // 3 hours

export interface CachedGetUsersResult {
  nextCursor: string;
  users: User[];
}

export const cachedGetUsers = async (
  cursor: string | null | undefined,
): Promise<CachedGetUsersResult> => {
  const v = valkey();
  if (await v.expire(key, ttl)) {
    const [nextCursor, elements] = await v.hscan(key, cursor ?? '0');
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

export const invalidateUserCache = () => {
  return valkey().del(key);
};
