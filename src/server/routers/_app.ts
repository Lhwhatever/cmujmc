/**
 * This file contains the root router of your tRPC-backend
 */
import { router, publicProcedure } from '../trpc';
import user from './user';
import rulesets from './ruleset';
import leagues from './league';
import events from './events';
import matches from './match';
import wwyd from './wwyd';

export const appRouter = router({
  healthcheck: publicProcedure.query(() => 'yay!'),
  user,
  rulesets,
  leagues,
  events,
  matches,
  wwyd,
});

export type AppRouter = typeof appRouter;
