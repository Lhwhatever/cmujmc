import { z } from 'zod';

export const create = z.object({
  leagueId: z.number().int(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  submissionBufferMinutes: z.number().min(0).optional(),
  rulesetOverrideId: z.number().int().min(1).optional(),
});

export const getByLeague = z.object({
  leagueId: z.number().int().min(1),
  limit: z.number().int().min(1).max(100).optional(),
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

export const list = z.object({
  limit: z.number().int().min(1).max(10).optional(),
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
