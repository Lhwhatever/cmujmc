import { z } from 'zod';
import * as Tile from '../mahjong/tiles';

export const winds = z.enum(['E', 'S', 'W', 'N']);

export const v1_schema = z.object({
  hand: z.object({
    tiles: Tile.mpszHandValidator,
    draw: Tile.mpszTileValidator.optional(),
    calls: z.array(z.any()).optional(),
  }),
  dora: z.array(Tile.mpszHandValidator),
  handNumber: z.object({
    prevalentWind: winds,
    dealerNumber: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
    ]),
    honba: z.number().int().nonnegative().optional(),
  }),
  seat: winds,
  turn: z.number().int().nonnegative(),
});

export default v1_schema;
