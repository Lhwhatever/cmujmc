import React from 'react';
import { RouterOutputs, trpc } from '../../utils/trpc';
import { TransactionType } from '@prisma/client';
import { NumberFormatOptions, useFormatter } from 'next-intl';
import Decimal from 'decimal.js';

export type PersonalStatsProps = {
  leagueId: number;
};

type Txns = RouterOutputs['leagues']['scoreHistory']['txns'];

const nullMax = (a: number | null, b: number | null): number | null => {
  if (a == null) return b;
  if (b == null) return a;
  return Math.max(a, b);
};

export const computeMatchStats = (
  txns: Txns,
  formatter: ReturnType<typeof useFormatter>,
) => {
  let numMatches = 0;
  let numChombos = 0;
  let gl = new Decimal(0);

  let highScore: number | null = null;
  let scoreSum = 0;
  const placements = { [1]: 0, [2]: 0, [3]: 0, [4]: 0 };
  let rankSum = 0;
  let ties = 0;

  for (const { type, match, delta } of txns) {
    switch (type) {
      case TransactionType.MATCH_RESULT:
        ++numMatches;
        gl = gl.add(new Decimal(delta));
        if (match != null) {
          scoreSum += match.rawScore ?? 0;
          highScore = nullMax(highScore, match.rawScore);
          if (match.placementMin !== null && match.placementMax !== null) {
            rankSum += (match.placementMin + match.placementMax) / 2;
            if (match.placementMin === match.placementMax) {
              const placement = match.placementMin as keyof typeof placements;
              placements[placement] = 1 + placements[placement];
            } else {
              ++ties;
            }
          }
        }
        break;
      case TransactionType.CHOMBO:
        ++numChombos;
        break;
    }
  }

  const percentStyle: NumberFormatOptions = {
    style: 'percent',
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  };

  const decimalStyle: NumberFormatOptions = {
    style: 'decimal',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  };

  if (numMatches === 0) {
    return {
      'Recorded Matches': 0,
    };
  }

  const numMatchesDecimal = new Decimal(numMatches);

  return {
    'Recorded Matches': numMatches,
    '1st Rate': formatter.number(placements[1] / numMatches, percentStyle),
    '2nd Rate': formatter.number(placements[2] / numMatches, percentStyle),
    '3rd Rate': formatter.number(placements[3] / numMatches, percentStyle),
    '4th Rate': formatter.number(placements[4] / numMatches, percentStyle),
    'Tie Rate': formatter.number(ties / numMatches, percentStyle),
    'Average rank': formatter.number(rankSum / numMatches, decimalStyle),
    Chombos: numChombos,
    'G/L per Match': formatter.number(
      gl.div(numMatchesDecimal).toNumber(),
      decimalStyle,
    ),
    'High Score': formatter.number(highScore!),
    'Mean Score': formatter.number(scoreSum / numMatches, decimalStyle),
  };
};

export function PersonalStats({ leagueId }: PersonalStatsProps) {
  const query = trpc.leagues.scoreHistory.useQuery(leagueId);
  const formatter = useFormatter();
  if (!query.data) return <></>;

  const stats = computeMatchStats(query.data.txns, formatter);

  return (
    <div className="grid gap-y-1 gap-x-8 mx-6 my-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
      {Object.entries(stats).map(([key, value]) => (
        <div className="flex flex-row justify-between" key={key}>
          <div className="font-bold">{key}</div>
          <div>{value}</div>
        </div>
      ))}
    </div>
  );
}
