import { z } from 'zod';
import wwydScenarioSchema from '../../utils/wwyd/basicSchema';

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
    schema: wwydScenarioSchema,
  }),
});
