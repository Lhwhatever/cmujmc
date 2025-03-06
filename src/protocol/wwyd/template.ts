import { z } from 'zod';

export const get = z.number();

export const list = z
  .object({
    limit: z.number().int().nonnegative().max(50),
    skip: z.number().int().nonnegative(),
  })
  .optional();

export const edit = z.object({
  id: z.number(),
  data: z.object({
    name: z.string(),
    schema: z.string().refine(
      (s) => {
        try {
          JSON.parse(s);
          return true;
        } catch (_) {
          return false;
        }
      },
      { message: 'Must be a valid JSON object' },
    ),
  }),
});
