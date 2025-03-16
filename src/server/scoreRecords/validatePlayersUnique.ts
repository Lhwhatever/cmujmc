import { z } from 'zod';
import schema from '../../protocol/schema';
import { CurrentMatch } from './types';
import { TRPCError } from '@trpc/server';

export default function validatePlayersUnique(
  currMatch: CurrentMatch,
  input: z.infer<typeof schema.match.editMatch>,
) {
  const registeredPlayers = new Set<string>();
  const guestPlayers = new Set<string>();
  for (let i = 0; i < input.players.length; ++i) {
    const { player } = input.players[i];
    if (player) {
      (player.type === 'registered' ? registeredPlayers : guestPlayers).add(
        player.payload,
      );
    } else {
      const { playerId, unregisteredPlaceholder } = currMatch.players[i];
      if (playerId !== null) registeredPlayers.add(playerId);
      if (unregisteredPlaceholder !== null)
        guestPlayers.add(unregisteredPlaceholder);
    }
  }

  if (registeredPlayers.size + guestPlayers.size !== input.players.length) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The players are not unique',
    });
  }
}
