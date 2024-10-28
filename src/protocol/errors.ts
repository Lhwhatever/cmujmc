import { TRPCError } from '@trpc/server';

export interface IFieldError<T extends Record<string, unknown>> {
  field: keyof T;
  message: string;
}

export class AdminUserError<
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

export class NotFoundError<T extends number | string> extends TRPCError {
  public constructor(path: string, id: T, cause?: unknown) {
    super({
      message: JSON.stringify({ path, id }),
      code: 'NOT_FOUND',
      cause,
    });
  }
}
