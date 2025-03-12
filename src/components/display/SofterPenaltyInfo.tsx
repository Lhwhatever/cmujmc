export interface SofterPenaltyProps {
  softPenaltyCutoff: number;
  freeChombos: number | null;
  leagueId: number;
  numMatches: number;
}

export default function SofterPenaltyInfo({ freeChombos }: SofterPenaltyProps) {
  return (
    <>
      {freeChombos !== null && (
        <div className="border bg-yellow-100 rounded-lg outline-yellow-800 p-2 m-2">
          You are under the softer penalty system. Your next{' '}
          <span className="font-bold">{freeChombos}</span> chombo(s) incur no
          penalty.
        </div>
      )}
    </>
  );
}
