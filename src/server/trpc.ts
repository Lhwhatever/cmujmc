/**
 * This is your entry point to setup the root configuration for tRPC on the server.
 * - `initTRPC` should only be used once per app.
 * - We export only the functionality that we use so we can enforce which base procedures should be used
 *
 * Learn how to create protected base procedures and other things below:
 * @link https://trpc.io/docs/v11/router
 * @link https://trpc.io/docs/v11/procedures
 */

import type { Context } from './context';
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { prisma } from './prisma';

const t = initTRPC.context<Context>().create({
  /**
   * @link https://trpc.io/docs/v11/data-transformers
   */
  transformer: superjson,
  /**
   * @link https://trpc.io/docs/v11/error-formatting
   */
  errorFormatter({ shape }) {
    return shape;
  },
});

export function throwUnauthorized(): never {
  throw new TRPCError({ code: 'UNAUTHORIZED' });
}

/**
 * Create a router
 * @link https://trpc.io/docs/v11/router
 */
export const router = t.router;

/**
 * Create an unprotected procedure
 * @link https://trpc.io/docs/v11/procedures
 **/
export const publicProcedure = t.procedure;

/**
 * @link https://trpc.io/docs/v11/merging-routers
 */
export const mergeRouters = t.mergeRouters;

/**
 * Protected base procedure
 */
export const authedProcedure = t.procedure.use(function isAuthed(opts) {
  console.log('Running authed procedure');
  const user = opts.ctx.session?.user;
  if (!user?.id) throwUnauthorized();
  return opts.next({
    ctx: { user },
  });
});

export const adminProcedure = t.procedure.use(async function isAdmin(opts) {
  const id = opts.ctx.session?.user?.id ?? throwUnauthorized();
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user?.admin) throwUnauthorized();
  return opts.next({
    ctx: { user },
  });
});
