import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { CreateWSSContextFnOptions } from '@trpc/server/src/adapters/ws';
import { auth } from '../auth/auth';
import { GetServerSidePropsContext } from 'next';
import { ServerResponse } from 'http';

function isCreateNextContextOptions(
  opts: CreateNextContextOptions | CreateWSSContextFnOptions,
): opts is CreateNextContextOptions {
  return 'getHeaders' in opts.res;
}

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/v11/context
 */
export const createContext = async (
  opts: CreateNextContextOptions | CreateWSSContextFnOptions,
) => {
  if (isCreateNextContextOptions(opts)) {
    const session = await auth(opts.req, opts.res);
    return { session };
  }

  const req: GetServerSidePropsContext['req'] = Object.assign(
    { cookies: {} },
    opts.req,
  );

  const res = {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    getHeader() {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setCookie() {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setHeader() {},
  } as unknown as ServerResponse;

  const session = await auth(req, res);
  return { session };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
