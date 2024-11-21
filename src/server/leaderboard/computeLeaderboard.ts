import { prisma } from '../prisma';
import {
  coalesceNames,
  NameCoalesced,
  User,
  userSelector,
} from '../../utils/usernames';
import {
  aggregateTxns,
  orderUnrankedUsers,
  Ranked,
  rankUsers,
  TxnAggregate,
  txnsSelector,
} from '../../utils/ranking';

export type UserLeagueRecord = {
  user: NameCoalesced<User>;
  agg: TxnAggregate;
  softPenalty: boolean;
};

export type Leaderboard = {
  lastUpdated: number;
  rankedUsers: Ranked<UserLeagueRecord>[];
  unrankedUsers: UserLeagueRecord[];
};

export default async function computeLeaderboard(
  leagueId: number,
): Promise<Leaderboard> {
  const lastUpdated = Date.now();
  const users = await prisma.userLeague.findMany({
    where: { leagueId },
    include: {
      user: userSelector,
      txns: txnsSelector,
      league: {
        select: {
          matchesRequired: true,
        },
      },
    },
  });

  const rankedUsers: UserLeagueRecord[] = [];
  const unrankedUsers: UserLeagueRecord[] = [];

  for (const { user, txns, league, freeChombos } of users) {
    const agg = aggregateTxns(txns);
    const record = {
      user: coalesceNames(user),
      agg,
      softPenalty: freeChombos !== null,
    };
    if (agg.numMatches >= league.matchesRequired) {
      rankedUsers.push(record);
    } else {
      unrankedUsers.push(record);
    }
  }

  return {
    lastUpdated,
    rankedUsers: rankUsers(leagueId, rankedUsers),
    unrankedUsers: orderUnrankedUsers(unrankedUsers),
  };
}
