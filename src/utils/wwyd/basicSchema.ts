import { z } from 'zod';

import schema_2d from './2d_schema';

const schema = z.string();
const version = z
  .string()
  .regex(
    new RegExp('^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
    'Must follow semantic versioning',
  );

const scenarioSchema = z.object({
  schema,
  version,
  scenario: schema_2d,
});

export const wwydScenarioWithSettingSchema = scenarioSchema.extend({
  settings: z.object({
    timeLimit: z.number().nonnegative(),
  }),
});

const wwydQuizSchema = z.object({
  scenarios: z.array(wwydScenarioWithSettingSchema),
});

export const wwydQuestionSchema = scenarioSchema.extend({
  settings: z.object({
    endDate: z.number(),
  }),
});

export default wwydQuizSchema;
