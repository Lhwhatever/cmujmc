import { wwydQuestionSchema } from '../../utils/wwyd/basicSchema';
import { z } from 'zod';
import { wwydResponseSchema } from '../../utils/wwyd/response';

export const playOutput = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('done'),
  }),
  z.object({
    type: z.literal('question'),
    id: z.number(),
    data: wwydQuestionSchema,
  }),
  z.object({
    type: z.literal('data'),
    id: z.number(),
    subject: z.string(),
    data: z.record(z.string().or(z.number())),
  }),
]);

export const submit = z.object({
  quizId: z.number().int(),
  questionId: z.number().int().nonnegative(),
  answer: wwydResponseSchema,
});
