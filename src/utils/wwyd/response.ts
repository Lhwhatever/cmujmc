import { z } from 'zod';
import { mpszTileValidator } from '../mahjong/tiles';

export const wwydResponseSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('none'),
    discard: mpszTileValidator.or(z.literal('tsumogiri')),
  }),
  z.object({
    action: z.literal('riichi'),
    discard: mpszTileValidator.or(z.literal('tsumogiri')),
  }),
]);

export type WwydResponse = z.infer<typeof wwydResponseSchema>;

export const responseToString = (response: WwydResponse) => {
  switch (response.action) {
    case 'none':
      return response.discard;
    case 'riichi':
      return `riichi:${response.discard}`;
  }
};
