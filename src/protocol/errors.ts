import { TRPCError } from '@trpc/server';

export interface IFieldError<T extends Record<string, unknown>> {
  field: keyof T;
  message: string;
}

export default class AdminUserError<
  T extends Record<string, unknown>,
> extends TRPCError {
  public constructor(error: IFieldError<T>, cause?: unknown) {
    super({
      message: JSON.stringify(error),
      code: 'BAD_REQUEST',
      cause,
    });
  }

  public static parse<T extends Record<string, unknown>>(
    message: string,
  ): IFieldError<T> | null {
    try {
      return JSON.parse(message) as IFieldError<T>;
    } catch (_) {
      console.error(message);
      return null;
    }
  }
}
