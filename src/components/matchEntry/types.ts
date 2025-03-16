import { RouterOutputs } from '../../utils/trpc';
import { UserOption } from '../UserComboBox';
import { RankedEvent } from '../display/RankedEventDetails';
import { z } from 'zod';

export type RankedMatch = NonNullable<
  RouterOutputs['matches']['getById']['match']
>;

export interface MatchPlayerFormData {
  time?: Date;
  players: UserOption[];
}

export type MatchPlayerFormOperation =
  | { type: 'create'; event: RankedEvent }
  | { type: 'update'; match: RankedMatch };

export const scoreEntrySchema = z.object({
  players: z.array(z.number().multipleOf(100)),
  leftoverBets: z.number().multipleOf(1000).min(0),
});

export type ScoreEntryFormData = z.infer<typeof scoreEntrySchema>;

export type CurrentChombos = NonNullable<
  RouterOutputs['matches']['getChombosOf']['chombos']
>;

export type ChomboFormData = string[][];
