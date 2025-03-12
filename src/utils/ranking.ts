import { createHash, BinaryLike } from 'crypto';
import { Prisma, TransactionType } from '@prisma/client';
import Decimal from 'decimal.js';
import assertNonNull, { assertRequired } from './nullcheck';
import { prisma } from '../server/prisma';

export const txnsSelector = Prisma.validator<Prisma.UserLeague$txnsArgs>()({
  select: {
    delta: true,
    time: true,
    type: true,
    match: {
      select: {
        rawScore: true,
        placementMin: true,
        placementMax: true,
      },
    },
  },
});

export interface TxnAggregate {
  score: Decimal;
  numMatches: number;
  highscore: number;
  placements: Map<number, number>;
  lastActivityDate: number;
}

type UserLeagueTransaction = Prisma.Result<
  typeof prisma.userLeagueTransaction,
  typeof txnsSelector,
  'findFirstOrThrow'
>;

export const aggregateEmpty: TxnAggregate = {
  score: new Decimal(0),
  numMatches: 0,
  highscore: Number.NEGATIVE_INFINITY,
  placements: new Map<number, number>(),
  lastActivityDate: Number.NEGATIVE_INFINITY,
};

export const aggregateSingleTxn = (
  txn: UserLeagueTransaction,
): TxnAggregate => {
  if (txn.type === TransactionType.MATCH_RESULT) {
    const { rawScore, placementMin, placementMax } = assertRequired(
      assertNonNull(txn.match, 'match'),
    );

    const placements = new Map<number, number>();
    if (placementMin === placementMax) {
      placements.set(placementMin, 1);
    }

    return {
      highscore: rawScore,
      lastActivityDate: txn.time.getTime(),
      numMatches: 1,
      placements,
      score: txn.delta,
    };
  }
  return {
    highscore: Number.NEGATIVE_INFINITY,
    lastActivityDate: txn.time.getTime(),
    numMatches: 0,
    placements: new Map(),
    score: txn.delta,
  };
};

export const reduceAggregates = (
  a: TxnAggregate,
  b: TxnAggregate,
): TxnAggregate => {
  const placements = new Map<number, number>();
  for (const p of [a, b]) {
    for (const [placement, count] of p.placements.entries()) {
      placements.set(placement, (placements.get(placement) ?? 0) + count);
    }
  }

  return {
    highscore: Math.max(a.highscore, b.highscore),
    lastActivityDate: Math.max(a.lastActivityDate, b.lastActivityDate),
    numMatches: a.numMatches + b.numMatches,
    placements,
    score: a.score.add(b.score),
  };
};

export const aggregateTxnArray = (a: UserLeagueTransaction[]) =>
  a.reduce(
    (acc, curr) => reduceAggregates(acc, aggregateSingleTxn(curr)),
    aggregateEmpty,
  );

export const aggregateTxns = (txns: UserLeagueTransaction[]): TxnAggregate => {
  return txns.reduce(
    (prev, curr) => reduceAggregates(prev, aggregateSingleTxn(curr)),
    aggregateEmpty,
  );
};

export interface IRankableUser {
  agg: TxnAggregate;
  softPenalty: boolean;
  user: { id: string; name: string | null };
}

const saltedHash = (id: BinaryLike, salt: BinaryLike) => {
  const md5sum = createHash('md5');
  md5sum.update(id);
  md5sum.update(salt);
  return md5sum.digest('hex');
};

const compareUsers =
  (hashTiebreakerSalt: BinaryLike) =>
  (a: IRankableUser, b: IRankableUser): number => {
    // Score: Higher is better
    const c1 = b.agg.score.cmp(a.agg.score);
    if (c1 !== 0) return c1;

    // Penalty System
    const c2 = (a.softPenalty ? 1 : 0) - (b.softPenalty ? 1 : 0);
    if (c2 !== 0) return c2;

    // 1sts: Higher is better
    const c4 = (b.agg.placements.get(1) ?? 0) - (a.agg.placements.get(1) ?? 0);
    if (c4 !== 0) return c4;

    // Highscore: Higher is better
    const c5 = b.agg.highscore - a.agg.highscore;
    if (!Number.isNaN(c5) && c5 !== 0) return c5;

    // Final Tiebreaker
    return saltedHash(a.user.id, hashTiebreakerSalt).localeCompare(
      saltedHash(b.user.id, hashTiebreakerSalt),
    );
  };

export type Ranked<T extends IRankableUser> = Omit<T, 'rank'> & {
  rank: number;
};

export type MaybeRanked<T extends IRankableUser> = Omit<T, 'rank'> & {
  rank?: number;
};

export const rankUsers = <T extends IRankableUser>(
  leagueId: number,
  users: T[],
): Ranked<T>[] => {
  const hashTiebrakerSalt = leagueId.toString();
  const sorted = users.toSorted(compareUsers(hashTiebrakerSalt));
  const first = sorted.findIndex(({ softPenalty }) => !softPenalty);

  if (first === -1)
    // no firsts, ranking starts from 2nd!
    return sorted.map((elt, index) => ({ rank: index + 2, ...elt }));

  return [
    sorted[first],
    ...sorted.slice(0, first),
    ...sorted.slice(first + 1),
  ].map((elt, index) => ({ rank: index + 1, ...elt }));
};

export const orderUnrankedUsers = <T extends IRankableUser>(users: T[]) =>
  users.toSorted((a, b) => {
    const c1 = b.agg.numMatches - a.agg.numMatches;
    if (c1 !== 0) return c1;

    const c2 = b.agg.score.cmp(a.agg.score);
    if (c2 !== 0) return c2;

    return (a.user.name ?? '').localeCompare(b.user.name ?? '');
  });
