import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { umaSelector } from '../../utils/scoring';

export const matchPlayerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('registered'), payload: z.string() }),
  z.object({ type: z.literal('unregistered'), payload: z.string() }),
]);

export type MatchPlayer = z.infer<typeof matchPlayerSchema>;

export const matchPlayerToPrisma = (player: MatchPlayer) => {
  switch (player.type) {
    case 'registered':
      return {
        playerId: player.payload,
        unregisteredPlaceholder: null,
      };

    case 'unregistered':
      return {
        playerId: null,
        unregisteredPlaceholder: player.payload,
      };
  }
};

export const currMatchSelector = Prisma.validator<Prisma.MatchSelect>()({
  status: true,
  players: {
    select: {
      playerId: true,
      unregisteredPlaceholder: true,
      txns: true,
    },
  },
  parent: {
    select: { parent: { select: { id: true, matchesRequired: true } } },
  },
  ruleset: {
    select: {
      gameMode: true,
      startPts: true,
      returnPts: true,
      chomboDelta: true,
      uma: umaSelector,
    },
  },
});

export type CurrentMatch = Prisma.MatchGetPayload<{
  select: typeof currMatchSelector;
}>;
