/**
 * This file contains the root router of your tRPC-backend
 */
import { router, publicProcedure } from '../trpc';
import { observable } from '@trpc/server/observable';
import { clearInterval } from 'timers';
import userRouter from './user';
import rulesetRouter from './ruleset';
import leagueRouter from './league';
import { eventRouter } from './events';

export const appRouter = router({
  healthcheck: publicProcedure.query(() => 'yay!'),
  user: userRouter,
  rulesets: rulesetRouter,
  leagues: leagueRouter,
  events: eventRouter,

  randomNumber: publicProcedure.subscription(() => {
    return observable<number>((emit) => {
      const int = setInterval(() => {
        emit.next(Math.random());
      }, 500);
      return () => {
        clearInterval(int);
      };
    });
  }),
});

export type AppRouter = typeof appRouter;
