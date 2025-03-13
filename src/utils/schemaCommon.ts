import { z } from 'zod';

export const zNonFatal = Symbol();

export function zAddIssue(ctx: z.RefinementCtx, msg: string): never;
export function zAddIssue(
  ctx: z.RefinementCtx,
  msg: string,
  _: typeof zNonFatal,
): void;
export function zAddIssue(
  ctx: z.RefinementCtx,
  message: string,
  token?: typeof zNonFatal,
) {
  ctx.addIssue({ code: 'custom', message });
  if (token !== zNonFatal) {
    return z.NEVER;
  }
}
