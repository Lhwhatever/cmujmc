import { z } from 'zod';

export const create = z.object({
  leagueId: z.number().int(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  submissionBufferMinutes: z.number().optional(),
});

export const getByLeague = z.object({
  leagueId: z.number().int(),
  limit: z.number().int().optional(),
  // default value is start-asc
  sortDirection: z.enum(['start-asc', 'start-desc']).optional(),
  // conjunction
  filters: z
    .array(
      z.object({
        lhs: z.enum(['startDate', 'endDate', 'closingDate']),
        op: z.enum(['gt', 'lt', 'gte', 'lte']),
        rhs: z.date(),
      }),
    )
    .optional(),
});
