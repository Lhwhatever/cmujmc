import Decimal from 'decimal.js';

export const sumTableScores = (
  playerScores: number[],
  leftoverBets: number,
): number => playerScores.reduce((acc, score) => acc + score, leftoverBets);

const THOUSAND = new Decimal(1000);

export const computePlayerPt = (
  rawScore: number,
  returnPts: number,
  placementMin: number,
  placementMax: number,
  uma: Decimal[],
) => {
  const delta = new Decimal(rawScore - returnPts).div(THOUSAND);
  const adjustment = uma
    .slice(placementMin - 1, placementMax)
    .reduce((prev, curr) => prev.add(curr))
    .div(new Decimal(placementMax - placementMin + 1));
  return delta.plus(adjustment);
};

export const computeTablePts = (
  playerScores: number[],
  returnPts: number,
  uma: Decimal[],
) => {
  if (playerScores.length !== uma.length) {
    throw new Error('Number of player scores does not match uma length');
  }

  // sort in desc order
  const sorted = playerScores.toSorted((a, b) => b - a);
  return playerScores.map((rawScore) => {
    const placementMin = 1 + sorted.indexOf(rawScore);
    const placementMax = 1 + sorted.lastIndexOf(rawScore);

    return {
      rawScore,
      placementMin,
      placementMax,
      pt: computePlayerPt(rawScore, returnPts, placementMin, placementMax, uma),
    };
  });
};
