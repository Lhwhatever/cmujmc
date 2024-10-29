import { createHash, BinaryLike } from 'crypto';
import { Prisma, TransactionType } from '@prisma/client';
import Decimal from 'decimal.js';

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

export type TxnAggregate = {
  score: Decimal;
  numMatches: number;
  highscore: number | null;
  placements: Record<number, number>;
};

export const aggregateTxns = (
  txns: Prisma.UserLeagueTransactionGetPayload<typeof txnsSelector>[],
): TxnAggregate => {
  let score = new Decimal(0);
  let highscore: number | null = null;
  let numMatches = 0;
  const placements: Record<number, number> = {};
  for (const { delta, type, match } of txns) {
    score = score.add(delta);
    if (type === TransactionType.MATCH_RESULT) {
      ++numMatches;
      const { rawScore, placementMin, placementMax } = match!;
      highscore = Math.max(highscore ?? Number.MIN_VALUE, rawScore!);
      if (placementMin === placementMax) {
        placements[placementMin!] = 1 + (placements[placementMin!] ?? 0);
      }
    }
  }
  return { score, highscore, numMatches, placements };
};

export interface IRankableUser {
  agg: TxnAggregate;
  softPenalty: boolean;
  user: { id: string; name: string };
}

const saltedHash = (id: BinaryLike, salt: BinaryLike) => {
  const md5sum = createHash('md5');
  md5sum.update(id);
  md5sum.update(salt);
  return md5sum.digest('hex');
};

const computeAvgPt = (score: Decimal, numHanchans: number) => {
  return score.div(new Decimal(numHanchans));
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

    // Score per Hanchan: Higher is better
    const c3 = computeAvgPt(b.agg.score, b.agg.numMatches).cmp(
      computeAvgPt(a.agg.score, a.agg.numMatches),
    );
    if (c3 !== 0) return c3;

    // 1sts: Higher is better
    const c4 = (b.agg.placements[1] ?? 0) - (a.agg.placements[1] ?? 0);
    if (c4 !== 0) return c4;

    // Highscore: Higher is better
    const c5 = b.agg.highscore! - a.agg.highscore!;
    if (c5 !== 0) return c5;

    // Final Tiebreaker
    return saltedHash(a.user.id, hashTiebreakerSalt).localeCompare(
      saltedHash(b.user.id, hashTiebreakerSalt),
    );
  };

export type Ranked<T extends IRankableUser> = Omit<T, 'rank'> & {
  rank: number;
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

    return a.user.name.localeCompare(b.user.name);
  });
