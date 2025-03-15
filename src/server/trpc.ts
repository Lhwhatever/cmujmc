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
import { ZodError } from 'zod';

const t = initTRPC.context<Context>().create({
  /**
   * @link https://trpc.io/docs/v11/data-transformers
   */
  transformer: superjson,
  /**
   * @link https://trpc.io/docs/v11/error-formatting
   */
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.code === 'BAD_REQUEST' && error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

interface AuthorizationUserParams {
  id: string;
  name?: string | null;
}

interface AuthorizationErrorParams {
  reason?: string;
  user?: AuthorizationUserParams | null;
}

const prettyUser = (user: AuthorizationUserParams) => {
  const id = user.id.slice(-6);
  return `user ${user.name} (id ends with ${id})`;
};

export class AuthorizationError extends TRPCError {
  params: AuthorizationErrorParams;

  constructor(params: AuthorizationErrorParams) {
    super({ code: 'UNAUTHORIZED', message: params.reason });
    this.params = params;
  }

  prettyUser() {
    return this.params.user
      ? prettyUser(this.params.user)
      : 'unauthenticated user';
  }

  logAndThrow(): never {
    console.warn(
      `Authorization: Denied ${this.prettyUser()}. Reason: ${
        this.params.reason
      }.\nStack trace:`,
      this.stack,
    );
    throw this;
  }
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
  const user =
    opts.ctx.session?.user ??
    new AuthorizationError({
      reason: 'Procedure requires authentication',
    }).logAndThrow();

  console.debug(`Authorization passed for: ${user.name}`);
  return opts.next({
    ctx: { user },
  });
});

const adminReason = 'Procedure requires admin privileges';

export const adminProcedure = t.procedure.use(async function isAdmin(opts) {
  const id =
    opts.ctx.session?.user?.id ??
    new AuthorizationError({
      reason: adminReason,
    }).logAndThrow();

  const user = await prisma.user.findUniqueOrThrow({ where: { id } });
  if (!user.admin)
    new AuthorizationError({
      reason: adminReason,
      user,
    }).logAndThrow();

  console.debug(`Authorization passed for admin procedure: ${user.name}`);
  return opts.next({
    ctx: { user },
  });
});
