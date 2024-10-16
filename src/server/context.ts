import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { CreateWSSContextFnOptions } from '@trpc/server/src/adapters/ws';
import { getSession } from 'next-auth/react';

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/v11/context
 */
export const createContext = async (
  opts: CreateNextContextOptions |  CreateWSSContextFnOptions
) => {
  const session = await getSession(opts);
  return {
    session
  }
};

export type Context = Awaited<ReturnType<typeof createContext>>;
