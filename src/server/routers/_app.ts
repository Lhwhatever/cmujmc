/**
 * This file contains the root router of your tRPC-backend
 */
import { router, publicProcedure } from '../trpc';
import userRouter from './user';
import rulesetRouter from './ruleset';
import leagueRouter from './league';
import { eventRouter } from './events';
import matchRouter from './match';

export const appRouter = router({
  healthcheck: publicProcedure.query(() => 'yay!'),
  user: userRouter,
  rulesets: rulesetRouter,
  leagues: leagueRouter,
  events: eventRouter,
  matches: matchRouter,
});

export type AppRouter = typeof appRouter;
