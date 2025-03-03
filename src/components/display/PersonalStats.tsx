import { RouterOutputs, trpc } from '../../utils/trpc';
import { TransactionType } from '@prisma/client';
import { NumberFormatOptions, useFormatter } from 'next-intl';
import Decimal from 'decimal.js';
import SofterPenaltyInfo from './SofterPenaltyInfo';

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
  let chomboLoss = new Decimal(0);
  let gl = new Decimal(0);
  let glsq = new Decimal(0);

  let highScore: number | null = null;
  let scoreSum = 0;
  const placements = { [1]: 0, [2]: 0, [3]: 0, [4]: 0 };
  let rankSum = 0;
  let ties = 0;

  for (const { type, match, delta } of txns) {
    switch (type) {
      case TransactionType.MATCH_RESULT: {
        ++numMatches;
        const deltaDecimal = new Decimal(delta);
        gl = gl.add(deltaDecimal);
        glsq = glsq.add(deltaDecimal.mul(deltaDecimal));
        if (match != null) {
          const user = match.players[match.userAt];
          scoreSum += user.rawScore ?? 0;
          highScore = nullMax(highScore, user.rawScore);
          if (user.placementMin !== null && user.placementMax !== null) {
            rankSum += (user.placementMin + user.placementMax) / 2;
            if (user.placementMin === user.placementMax) {
              const placement = user.placementMin as keyof typeof placements;
              placements[placement] = 1 + placements[placement];
            } else {
              ++ties;
            }
          }
        }
        break;
      }
      case TransactionType.CHOMBO:
        ++numChombos;
        chomboLoss = chomboLoss.add(delta);
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
  const stdev = glsq.minus(gl.mul(gl)).sqrt().div(numMatchesDecimal);

  return {
    'Recorded Matches': numMatches,
    '1st Rate': formatter.number(placements[1] / numMatches, percentStyle),
    '2nd Rate': formatter.number(placements[2] / numMatches, percentStyle),
    '3rd Rate': formatter.number(placements[3] / numMatches, percentStyle),
    '4th Rate': formatter.number(placements[4] / numMatches, percentStyle),
    'Tie Rate': formatter.number(ties / numMatches, percentStyle),
    'Average rank': formatter.number(rankSum / numMatches, decimalStyle),
    Chombos: `${formatter.number(numChombos)} (${chomboLoss.toString()} PT)`,
    'G/L per Match':
      formatter.number(gl.div(numMatchesDecimal).toNumber(), decimalStyle) +
      ' PT',
    StDev: stdev.toFixed(2) + ' PT',
    'High Score': highScore !== null ? formatter.number(highScore) : '-',
    'Mean Score': formatter.number(scoreSum / numMatches, decimalStyle),
  };
};

export interface PersonalStatsProps {
  softPenaltyCutoff: number;
  freeChombos: number | null;
  leagueId: number;
}

export function PersonalStats({
  leagueId,
  freeChombos,
  softPenaltyCutoff,
}: PersonalStatsProps) {
  const query = trpc.leagues.scoreHistory.useQuery(leagueId);
  const formatter = useFormatter();
  if (!query.data) return <></>;

  const stats = computeMatchStats(query.data.txns, formatter);

  return (
    <>
      <SofterPenaltyInfo
        softPenaltyCutoff={softPenaltyCutoff}
        freeChombos={freeChombos}
        leagueId={leagueId}
        numMatches={stats['Recorded Matches']}
      />
      <div className="grid gap-y-1 gap-x-8 mx-6 my-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {Object.entries(stats).map(([key, value]) => (
          <div className="flex flex-row justify-between" key={key}>
            <div className="font-bold">{key}</div>
            <div>{value}</div>
          </div>
        ))}
      </div>
    </>
  );
}
