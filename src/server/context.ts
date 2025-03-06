import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { CreateWSSContextFnOptions } from '@trpc/server/src/adapters/ws';
import { auth } from '../auth/auth';
import { GetServerSidePropsContext } from 'next';
import { ServerResponse } from 'http';
import * as cookie from 'cookie';

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
  console.log(
    'socket address',
    opts.req.socket.remoteAddress,
    opts.req.socket.remotePort,
  );
  if (isCreateNextContextOptions(opts)) {
    return { session: await auth(opts.req, opts.res) };
  }

  const cookies = cookie.parse(opts.req.headers.cookie ?? '');
  const req: GetServerSidePropsContext['req'] = Object.assign(
    { cookies },
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

  return { session: await auth(req, res) };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
