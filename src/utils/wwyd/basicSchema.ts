import { z } from 'zod';

const schema = z.string();
const version = z
  .string()
  .regex(
    new RegExp('^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
    'Must follow semantic versioning',
  );

const wwydQuizSchema = z.object({
  scenarios: z.array(
    z.object({
      schema,
      version,
      scenario: z.any(),
      settings: z.object({
        timeLimit: z.number().nonnegative(),
      }),
    }),
  ),
});

export const wwydQuestionSchema = z.object({
  schema,
  version,
  scenario: z.any(),
  settings: z.object({
    endDate: z.number(),
  }),
});

export default wwydQuizSchema;
