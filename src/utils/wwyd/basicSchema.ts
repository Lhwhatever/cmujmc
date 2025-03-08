import { z } from 'zod';

import schema_2d from './2d_schema';
import { mpszTileValidator } from '../mahjong/tiles';

const schema = z.string();
const version = z
  .string()
  .regex(
    new RegExp('^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
    'Must follow semantic versioning',
  );

const scenario = z.object({
  schema,
  version,
  scenario: schema_2d,
});

const wwydQuizSchema = z.object({
  scenarios: z.array(
    scenario.extend({
      settings: z.object({
        timeLimit: z.number().nonnegative(),
      }),
    }),
  ),
});

export const wwydQuestionSchema = scenario.extend({
  settings: z.object({
    endDate: z.number(),
  }),
});

export const moveSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('none'),
    discard: mpszTileValidator.or(z.literal('tsumogiri')),
  }),
  z.object({
    action: z.literal('riichi'),
    discard: mpszTileValidator.or(z.literal('tsumogiri')),
  }),
]);

export default wwydQuizSchema;
