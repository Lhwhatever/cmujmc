import { wwydQuestionSchema } from '../../utils/wwyd/basicSchema';
import { z } from 'zod';

export const playOutput = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('done'),
  }),
  z.object({
    type: z.literal('question'),
    id: z.number(),
    data: wwydQuestionSchema,
  }),
]);
