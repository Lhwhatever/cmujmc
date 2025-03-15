import { RankedMatch } from '../matchEntry/MatchEntryDialog';

export type RankedMatchPlayer = RankedMatch['players'][number]['player'];

export interface MatchPlayerNameProps {
  player: RankedMatchPlayer;
  unregisteredPlaceholder: string | null;
}

export default function MatchPlayerName({
  player,
  unregisteredPlaceholder,
}: MatchPlayerNameProps) {
  if (player !== null) return <span>{player.name}</span>;
  else return <span>Guest &lsquo;{unregisteredPlaceholder}&rsquo;</span>;
}
