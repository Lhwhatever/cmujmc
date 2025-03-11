import Decimal from 'decimal.js';
import {
  aggregateEmpty,
  aggregateTxnArray,
  reduceAggregates,
  TxnAggregate,
  txnsSelector,
} from '../../utils/ranking';
import makeValkey from './makeValkey';
import Valkey from 'iovalkey';
import superjson from 'superjson';
import lodash from 'lodash';
import { prisma } from '../prisma';
import assertNonNull from '../../utils/nullcheck';

const valkey = makeValkey((id) => `league:${id}:`);

const keys = {
  updated: 'updated',
  leaderboard: 'leaderboard',
  records: 'records',
  unranked: 'unranked',
};

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
    delay(backoff);
    backoff *= 2;
  }
  throw `Gave up after ${tries} tries`;
};

export interface LeaderboardEntry {
  rank: number | undefined;
  userId: string;
  agg: TxnAggregate;
}

const isLeaderboardCached = async (v: Valkey): Promise<boolean> => {
  const result = await v
    .multi()
    .exists(keys.updated)
    .expire(keys.records, ttl)
    .expire(keys.updated, ttl)
    .expire(keys.leaderboard, ttl)
    .expire(keys.unranked, ttl)
    .exec();

  const [[_, existsResults]] = assertNonNull(result, 'isLeaderboardCached');
  return existsResults === 1;
};

export const getLastLeaderboardUpdate = async (
  leagueId: number,
): Promise<number | null> => {
  const v = valkey(leagueId);
  const s = await v.get(keys.updated);
  if (s === null) return null;
  return parseInt(s);
};

export interface Leaderboard {
  entries: LeaderboardEntry[];
  lastUpdated: number;
}

const getCachedLeaderboard = async (v: Valkey): Promise<Leaderboard | null> => {
  if (!(await isLeaderboardCached(v))) {
    return null;
  }

  return withBackoff(
    async () => {
      await v.watch(keys.records);
      const ranked = await v.zrevrangebyscore(keys.leaderboard, '+inf', '-inf');
      const unranked = await v.zrevrangebyscore(keys.unranked, '+inf', '0');
      const lastUpdated = parseInt(
        assertNonNull(await v.get(keys.updated), 'get keys.updated'),
      );

      if (ranked.length + unranked.length === 0) {
        return { lastUpdated, entries: [] };
      }

      const userIds = [...ranked, ...unranked];

      const resultRecords = await v
        .multi()
        .hmget(keys.records, ...userIds)
        .exec();

      if (resultRecords !== null) {
        const [error, records] = resultRecords[0];
        if (error === null && records !== null) {
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
      }

      return null;
    },
    50,
    5,
  );
};

const updateCacheEntries = async (
  v: Valkey,
  requiredMatchesForRank: number,
  entries: UpdateLeaderboardPlayerRecord[],
) => {
  let commands = v.multi().set(keys.updated, Date.now());

  if (entries.length > 0) {
    const recordEntries = entries.flatMap(({ userId, aggregate }) => [
      userId,
      superjson.stringify(aggregate),
    ]);

    commands = commands.hmset(keys.records, ...recordEntries);
  }

  const [ranked, unranked] = lodash.partition(
    entries,
    (entry) => entry.aggregate.numMatches >= requiredMatchesForRank,
  );

  if (ranked.length > 0) {
    const rankedZAddEntries = ranked.flatMap(({ userId, aggregate }) => [
      computeLeaderboardScore(aggregate).toString(),
      userId,
    ]);

    const unrankedZRemEntries = ranked.map(({ userId }) => userId);

    commands = commands
      .zrem(keys.unranked, ...unrankedZRemEntries)
      .zadd(keys.leaderboard, ...rankedZAddEntries);
  }

  if (unranked.length > 0) {
    const rankedZRemEntries = unranked.map(({ userId }) => userId);

    const unrankedZAddEntries = unranked.flatMap(({ userId, aggregate }) => [
      aggregate.numMatches.toString(),
      userId,
    ]);

    commands = commands
      .zrem(keys.leaderboard, ...rankedZRemEntries)
      .zadd(keys.unranked, ...unrankedZAddEntries);
  }

  return commands
    .set(keys.updated, Date.now())
    .expire(keys.updated, ttl)
    .expire(keys.leaderboard, ttl)
    .expire(keys.records, ttl)
    .expire(keys.unranked, ttl)
    .exec();
};

const regenerateLeaderboard = async (
  v: Valkey,
  leagueId: number,
  requiredMatchesForRank: number,
  userIds?: string[],
) => {
  const users = await prisma.userLeague.findMany({
    select: {
      userId: true,
      txns: txnsSelector,
    },
    where: {
      leagueId,
      userId: userIds !== undefined ? { in: userIds } : undefined,
    },
  });

  return updateCacheEntries(
    v,
    requiredMatchesForRank,
    users.map(({ userId, txns }) => ({
      userId,
      aggregate: aggregateTxnArray(txns),
    })),
  );
};

export const cachedGetLeaderboard = async (leagueId: number) => {
  const v = valkey(leagueId);
  const cachedLeaderboard = await getCachedLeaderboard(v);
  return (
    cachedLeaderboard ??
    // regenerate leaderboard
    (await withBackoff(
      async () => {
        const { matchesRequired } = await prisma.league.findUniqueOrThrow({
          where: { id: leagueId },
          select: {
            matchesRequired: true,
          },
        });

        return (
          (await regenerateLeaderboard(v, leagueId, matchesRequired)) &&
          (await getCachedLeaderboard(v))
        );
      },
      50,
      5,
    ))
  );
};

export const updateLeaderboardEntries = async (
  leagueId: number,
  requiredMatchesForRank: number,
  players: UpdateLeaderboardPlayerRecord[],
) => {
  const v = valkey(leagueId);
  if (!(await isLeaderboardCached(v))) {
    // not in cache, nothing to update
    return;
  }

  await withBackoff(
    async () => {
      await v.watch(keys.leaderboard, keys.records, keys.unranked);
      const currRecords = await v.hmget(
        keys.records,
        ...players.map((players) => players.userId),
      );

      const newEntries = players.map(({ userId, aggregate }, i) => {
        const serialized = currRecords[i];
        const currRecord =
          serialized !== null
            ? superjson.parse<TxnAggregate>(serialized)
            : aggregateEmpty;
        return { userId, aggregate: reduceAggregates(aggregate, currRecord) };
      });

      return updateCacheEntries(v, requiredMatchesForRank, newEntries);
    },
    50,
    5,
  );
};

export const recomputePlayersOnLeaderboard = async (
  leagueId: number,
  userIds?: string[],
): Promise<void> => {
  const v = valkey(leagueId);
  if (!(await isLeaderboardCached(v))) return;

  await withBackoff(
    async () => {
      const { matchesRequired } = await prisma.league.findUniqueOrThrow({
        where: { id: leagueId },
        select: {
          matchesRequired: true,
        },
      });
      return regenerateLeaderboard(v, leagueId, matchesRequired, userIds);
    },
    50,
    5,
  );
};
