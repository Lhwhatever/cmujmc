import { renderAliases } from '../../utils/usernames';
import { RankedMatch } from '../matchEntry/types';

export type RankedMatchPlayer = RankedMatch['players'][number]['player'];

export interface MatchPlayerNameProps {
  player: RankedMatchPlayer;
  unregisteredPlaceholder: string | null;
}

export default function MatchPlayerName({
  player,
  unregisteredPlaceholder,
}: MatchPlayerNameProps) {
  if (player !== null) return <span>{renderAliases(player.name, player)}</span>;
  else return <span>Guest &lsquo;{unregisteredPlaceholder}&rsquo;</span>;
}
