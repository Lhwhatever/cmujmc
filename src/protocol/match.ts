import { z } from 'zod';

export const create = z.object({
  eventId: z.number().min(0),
  players: z
    .array(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('registered'), payload: z.string() }),
        z.object({ type: z.literal('unregistered'), payload: z.string() }),
      ]),
    )
    .min(3)
    .max(4)
    .refine(
      (array) => {
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
      },
      {
        message: 'Users must be unique',
      },
    ),
});

export const record = z.object({
  matchId: z.number().min(0),
  players: z.array(
    z.object({
      score: z.number().multipleOf(100),
      chombos: z.string().array(),
    }),
  ),
  time: z.date().optional(),
  leftoverBets: z.number().multipleOf(1000),
});
