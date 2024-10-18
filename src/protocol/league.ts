import { z } from 'zod';

export const get = z.number().int();

export const create = z.object({
  name: z.string().min(1),
  description: z.string(),
  invitational: z.boolean(),
  defaultRulesetId: z.number().int(),
  startingPoints: z
    .number({
      required_error: 'Starting rating is required',
      invalid_type_error: 'Starting rating must be a number',
    })
    .step(0.1, 'Starting rating must be a multiple of 0.1'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  singleEvent: z.boolean().optional(),
});
