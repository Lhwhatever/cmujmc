import { z } from 'zod';
import { matchPlayerSchema } from '../server/scoreRecords/types';

export const arePlayersDistinct = (
  array: z.infer<typeof matchPlayerSchema>[],
) => {
  const categories: Record<string, Set<string>> = {};
  for (const elt of array) {
    const s = categories[elt.type] ?? new Set();
    categories[elt.type] = s.add(elt.payload);
  }
  return (
    array.length ===
    Object.values(categories)
      .map((set) => set.size)
      .reduce((a, b) => a + b)
  );
};

export const create = z.object({
  eventId: z.number().int().nonnegative(),
  players: z
    .array(matchPlayerSchema)
    .min(3)
    .max(4)
    .refine(arePlayersDistinct, { message: 'Players must be distinct!' }),
  time: z.date().optional(),
});

export const editMatch = z.object({
  matchId: z.number().int(),
  players: z.array(
    z.object({
      player: matchPlayerSchema.optional(),
      score: z.number().multipleOf(100),
      chombos: z.string().array().optional(),
    }),
  ),
  time: z.date().optional(),
  leftoverBets: z.number().min(0).multipleOf(1000),
  commit: z.boolean(),
});

export const record = z.object({
  matchId: z.number().min(0),
  players: z.array(
    z.object({
      score: z.number().multipleOf(100),
      chombos: z.string().array().optional(),
    }),
  ),
  time: z.date().optional(),
  leftoverBets: z.number().multipleOf(1000),
  commit: z.boolean(),
});
