import Valkey, { RedisValue } from 'iovalkey';
import { JSONObject } from 'superjson/src/types';
import superjson from 'superjson';

const valkeyUrl = process.env['VALKEY_URL'] ?? 'redis://localhost:6379';

export default function makeValkey(template: (id: number | string) => string) {
  return (id?: string | number) =>
    new Valkey(valkeyUrl, {
      keyPrefix: id === undefined ? undefined : template(id),
    });
}

export interface XReadArgs {
  count?: number;
  blockMs?: number;
  retries?: number;
}

export interface XReadResultEntry<T> {
  id: string;
  entry: T;
}

export class VStream<T extends JSONObject> {
  readonly valkey: Valkey;
  readonly streamKey: string;

  constructor(valkey: Valkey, streamKey: string) {
    this.valkey = valkey;
    this.streamKey = streamKey;
  }

  public async xadd(fields: T, noMkStream = false) {
    const args: RedisValue[] = [];

    if (noMkStream) {
      args.push('NOMKSTREAM');
    }

    args.push('*');

    for (const [field, value] of Object.entries(fields)) {
      args.push(field, superjson.stringify(value));
    }
    return this.valkey.xadd(this.streamKey, ...args);
  }

  public async xread(
    id: string | number = 0,
    opts?: XReadArgs,
  ): Promise<XReadResultEntry<T>[] | null> {
    let tries = 0;
    let result: Awaited<ReturnType<typeof Valkey.prototype.xread>> = null;

    while (result === null) {
      if (opts?.retries !== undefined && tries > opts?.retries) {
        break;
      }

      result = await (opts?.count === undefined
        ? opts?.blockMs === undefined
          ? this.valkey.xread('STREAMS', this.streamKey, id)
          : this.valkey.xread(
              'BLOCK',
              opts.blockMs,
              'STREAMS',
              this.streamKey,
              id,
            )
        : opts?.blockMs === undefined
        ? this.valkey.xread('COUNT', opts.count, 'STREAMS', this.streamKey, id)
        : this.valkey.xread(
            'COUNT',
            opts.count,
            'BLOCK',
            opts.blockMs,
            'STREAMS',
            this.streamKey,
            id,
          ));
      ++tries;
    }

    if (result === null) return null;

    const [[_, entries]] = result;
    return entries.map(([id, messageParts]) => {
      const entry: Partial<T> = {};
      for (let i = 0; i < messageParts.length; i += 2) {
        const field = messageParts[i] as keyof T;
        entry[field] = superjson.parse<T[typeof field]>(messageParts[i + 1]);
      }
      return { id, entry: entry as T };
    });
  }
}
