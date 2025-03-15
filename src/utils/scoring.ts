import { Prisma, TransactionType } from '@prisma/client';
import Decimal from 'decimal.js';

export const umaSelector = Prisma.validator<Prisma.Ruleset$umaArgs>()({
  select: { value: true },
  orderBy: { position: 'asc' },
});

export const umaSerializer = (
  uma: Prisma.RulesetUmaGetPayload<typeof umaSelector>[],
) => uma.map(({ value }) => value.toString());

export const sumTableScores = (
  playerScores: number[],
  leftoverBets: number,
): number => playerScores.reduce((acc, score) => acc + score, leftoverBets);

const THOUSAND = new Decimal(1000);

export const computePlacements = (playerScores: number[]) => {
  const desc = playerScores.toSorted((a, b) => b - a);
  return playerScores.map((rawScore) => ({
    placementMin: 1 + desc.indexOf(rawScore),
    placementMax: 1 + desc.lastIndexOf(rawScore),
  }));
};

export interface ComputePlayerPtArg {
  rawScore: number;
  returnPts: number;
  placementMin: number;
  placementMax: number;
  uma: Decimal[];
}

export const computePlayerPt = ({
  rawScore,
  returnPts,
  placementMin,
  placementMax,
  uma,
}: ComputePlayerPtArg): Decimal => {
  const delta = new Decimal(rawScore - returnPts).div(THOUSAND);
  const adjustment = uma
    .slice(placementMin - 1, placementMax)
    .reduce((prev, curr) => prev.add(curr))
    .div(new Decimal(placementMax - placementMin + 1));
  return delta.plus(adjustment);
};

export type ComputeUserLeagueTxnArgs = ComputePlayerPtArg & {
  playerId: string;
  matchId: number;
  playerPosition: number;
  leagueId: number;
  time: Date;
  chombos: number | string[];
  chomboDelta: Decimal;
  uma: Decimal[];
};

export const computeTransactions = ({
  playerId,
  matchId,
  playerPosition,
  leagueId,
  time,
  chombos,
  chomboDelta,
  ...playerPtArg
}: ComputeUserLeagueTxnArgs): Prisma.UserLeagueTransactionCreateManyInput[] => {
  const matchResultTxn = {
    type: TransactionType.MATCH_RESULT,
    userId: playerId,
    leagueId,
    delta: computePlayerPt(playerPtArg),
    time,
    userMatchMatchId: matchId,
    userMatchPlayerPosition: playerPosition,
  };

  const chomboDescriptions: (string | null)[] = Array.isArray(chombos)
    ? chombos
    : new Array<string | null>(chombos).fill(null);

  const chomboTxns = chomboDescriptions.map((description) => ({
    type: TransactionType.CHOMBO,
    userId: playerId,
    leagueId,
    delta: chomboDelta,
    time,
    description,
    userMatchMatchId: matchId,
    userMatchPlayerPosition: playerPosition,
  }));

  return [matchResultTxn, ...chomboTxns];
};
