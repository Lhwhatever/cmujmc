import Decimal from 'decimal.js';
import {
  aggregateTxnArray,
  TxnAggregate,
  txnsSelector,
} from '../../utils/ranking';
import superjson from 'superjson';
import { inferKeyMap, makeKeyMap } from './glide';
import lodash from 'lodash';
import { prisma } from '../prisma';
import assertNonNull from '../../utils/nullcheck';
import {
  ClusterTransaction,
  GlideClusterClient,
  InfBoundary,
} from '@valkey/valkey-glide';
import { PrismaClient } from '@prisma/client';
import * as runtime from '@prisma/client/runtime/library';

const keymap = makeKeyMap(['league'], {
  updated: 'updated',
  leaderboard: 'leaderboard',
  records: 'records',
  unranked: 'unranked',
});

const computeLeaderboardScore = (t: TxnAggregate): Decimal => {
  const scoreRescaled = t.score.mul(120).round(); // resolution of 1/120

  const numFirsts = t.placements.get(1) ?? 0;
  const numFirstsRange = 1024;
  const numFirstsClamped = Math.min(Math.max(0, numFirsts), numFirstsRange - 1);

  const highScoreNormalized = t.highscore / 100; // resolution of 100
  const highScoreRange = 65536;
  const highScoreClamped = Math.min(
    Math.max(0, highScoreNormalized + highScoreRange / 2),
    highScoreRange - 1,
  );

  return new Decimal(
    (highScoreClamped / highScoreRange + numFirstsClamped) / numFirstsRange,
  ).add(scoreRescaled);
};

export interface UpdateLeaderboardPlayerRecord {
  userId: string;
  aggregate: TxnAggregate;
}

const ttl = 3 * 60 * 60; // 3 hours

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withBackoff = async <T>(
  f: () => Promise<T | null>,
  initialBackoff: number,
  tries: number,
): Promise<T> => {
  let backoff = initialBackoff;
  for (let i = 0; i < tries; ++i) {
    const result = await f();
    if (result !== null) return result;
    await delay(backoff);
    backoff *= 2;
  }
  throw `Gave up after ${tries} tries`;
};

export interface LeaderboardEntry {
  rank: number | undefined;
  userId: string;
  agg: TxnAggregate;
}

const isLeaderboardCached = async (
  cache: GlideClusterClient,
  k: inferKeyMap<typeof keymap>,
): Promise<boolean> => {
  const transaction = new ClusterTransaction()
    .exists([k.updated])
    .expire(k.records, ttl)
    .expire(k.updated, ttl)
    .expire(k.leaderboard, ttl)
    .expire(k.unranked, ttl);

  const [existsResults] = assertNonNull(
    await cache.exec(transaction),
    'isLeaderboardCached',
  );
  return existsResults === 1;
};

export const getLastLeaderboardUpdate = async (
  cache: GlideClusterClient,
  leagueId: number,
): Promise<number | null> => {
  const k = keymap(leagueId);
  const s = await cache.get(k.updated);
  if (s === null) return null;
  return parseInt(s as string);
};

export interface Leaderboard {
  entries: LeaderboardEntry[];
  lastUpdated: number;
}

const getCachedLeaderboard = async (
  cache: GlideClusterClient,
  k: inferKeyMap<typeof keymap>,
): Promise<Leaderboard | null> => {
  if (!(await isLeaderboardCached(cache, k))) {
    return null;
  }

  return withBackoff(
    async () => {
      await cache.watch([k.records]);

      const ranked = await cache.zrange(
        k.leaderboard,
        {
          type: 'byScore',
          start: InfBoundary.PositiveInfinity,
          end: InfBoundary.NegativeInfinity,
        },
        { reverse: true },
      );

      const unranked = await cache.zrange(
        k.unranked,
        {
          type: 'byScore',
          start: InfBoundary.PositiveInfinity,
          end: InfBoundary.NegativeInfinity,
        },
        { reverse: true },
      );

      const lastUpdated = parseInt(
        assertNonNull(await cache.get(k.updated), 'get keys.updated') as string,
      );

      if (ranked.length + unranked.length === 0) {
        return { lastUpdated, entries: [] };
      }

      const userIds = [...ranked, ...unranked];
      const txn = new ClusterTransaction().hmget(k.records, userIds);

      const resultRecords = await cache.exec(txn);
      if (resultRecords === null) return null;
      const [records] = resultRecords;
      if (records !== null) {
        return {
          entries: (records as string[]).map((record, index) => {
            if (record === null) throw 'Missing user';
            return {
              rank: index < ranked.length ? index + 1 : undefined,
              userId: userIds[index],
              agg: superjson.parse<TxnAggregate>(record),
            } as LeaderboardEntry;
          }),
          lastUpdated,
        } as Leaderboard;
      }

      return null;
    },
    50,
    5,
  );
};

const updateCacheEntries = async (
  cache: GlideClusterClient,
  k: inferKeyMap<typeof keymap>,
  requiredMatchesForRank: number,
  entries: UpdateLeaderboardPlayerRecord[],
) => {
  let cacheTxn = new ClusterTransaction().set(k.updated, Date.now().toString());

  if (entries.length > 0) {
    const recordEntries: Record<string, string> = {};
    for (const { userId, aggregate } of entries) {
      recordEntries[userId] = superjson.stringify(aggregate);
    }
    cacheTxn = cacheTxn.hset(k.records, recordEntries);
  }

  const [ranked, unranked] = lodash.partition(
    entries,
    (entry) => entry.aggregate.numMatches >= requiredMatchesForRank,
  );

  if (ranked.length > 0) {
    const rankedZAddEntries: Record<string, number> = {};
    for (const { userId, aggregate } of ranked) {
      rankedZAddEntries[userId] = computeLeaderboardScore(aggregate).toNumber();
    }

    const unrankedZRemEntries = ranked.map(({ userId }) => userId);
    cacheTxn = cacheTxn
      .zrem(k.unranked, unrankedZRemEntries)
      .zadd(k.leaderboard, rankedZAddEntries);
  }

  if (unranked.length > 0) {
    const rankedZRemEntries = unranked.map(({ userId }) => userId);
    const unrankedZAddEntries: Record<string, number> = {};
    for (const { userId, aggregate } of unranked) {
      unrankedZAddEntries[userId] = aggregate.numMatches;
    }

    cacheTxn = cacheTxn
      .zrem(k.leaderboard, rankedZRemEntries)
      .zadd(k.unranked, unrankedZAddEntries);
  }

  return cache.exec(
    cacheTxn
      .set(k.updated, Date.now().toString())
      .expire(k.updated, ttl)
      .expire(k.leaderboard, ttl)
      .expire(k.records, ttl)
      .expire(k.unranked, ttl),
  );
};

const regenerateLeaderboard = async <
  Prisma extends Omit<PrismaClient, runtime.ITXClientDenyList>,
>(
  cache: GlideClusterClient,
  prisma: Prisma,
  k: inferKeyMap<typeof keymap>,
  leagueId: number,
  requiredMatchesForRank: number,
  userIds?: string[],
) => {
  const users = await prisma.userLeague.findMany({
    where: {
      leagueId,
      userId: userIds !== undefined ? { in: userIds } : undefined,
    },
    select: {
      user: {
        select: {
          id: true,
          transactions: {
            where: { leagueId },
            select: txnsSelector.select,
          },
        },
      },
    },
  });

  return updateCacheEntries(
    cache,
    k,
    requiredMatchesForRank,
    users.map(({ user }) => ({
      userId: user.id,
      aggregate: aggregateTxnArray(user.transactions),
    })),
  );
};

export const cachedGetLeaderboard = async (
  cache: GlideClusterClient,
  leagueId: number,
) => {
  const k = keymap(leagueId);
  const cachedLeaderboard = await getCachedLeaderboard(cache, k);
  return (
    cachedLeaderboard ??
    (await withBackoff(
      async () => {
        // regenerate leaderboard
        const { matchesRequired } = await prisma.league.findUniqueOrThrow({
          where: { id: leagueId },
          select: {
            matchesRequired: true,
          },
        });

        const result = await regenerateLeaderboard(
          cache,
          prisma,
          k,
          leagueId,
          matchesRequired,
        );
        if (result === null) return null;

        return getCachedLeaderboard(cache, k);
      },
      50,
      5,
    ))
  );
};

export const recomputePlayersOnLeaderboard = async <
  Prisma extends Omit<PrismaClient, runtime.ITXClientDenyList>,
>(
  cache: GlideClusterClient,
  prisma: Prisma,
  leagueId: number,
  matchesRequired: number,
  userIds?: string[],
): Promise<void> => {
  const k = keymap(leagueId);
  if (await isLeaderboardCached(cache, k)) {
    await withBackoff(
      () =>
        regenerateLeaderboard(
          cache,
          prisma,
          k,
          leagueId,
          matchesRequired,
          userIds,
        ),
      50,
      5,
    );
  }
};
