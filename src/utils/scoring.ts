import Decimal from 'decimal.js';

export const sumTableScores = (
  playerScores: number[],
  leftoverBets: number,
): number => playerScores.reduce((acc, score) => acc + score, leftoverBets);

const THOUSAND = new Decimal(1000);

export const computePts = (
  playerScores: number[],
  returnPts: number,
  uma: Decimal[],
) => {
  if (playerScores.length !== uma.length) {
    throw new Error('Number of player scores does not match uma length');
  }

  const sorted = playerScores.toSorted();
  return playerScores.map((rawScore) => {
    const placementMin = 1 + sorted.indexOf(rawScore);
    const placementMax = 1 + sorted.lastIndexOf(rawScore);

    const delta = new Decimal(rawScore - returnPts).div(THOUSAND);
    const adjustment = uma
      .slice(placementMin - 1, placementMax)
      .reduce((prev, curr) => prev.add(curr))
      .div(new Decimal(placementMax - placementMin + 1));

    return {
      rawScore,
      placementMin,
      placementMax,
      pt: delta.plus(adjustment),
    };
  });
};
