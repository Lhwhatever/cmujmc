import { GlideClusterClient } from '@valkey/valkey-glide';
import { TimeUnit } from '@valkey/valkey-glide/build-ts/src/Commands';
import superjson from 'superjson';
import assertNonNull from '../../utils/nullcheck';
import { JSONObject } from 'superjson/dist/types';

const valkeyHost = process.env.VALKEY_HOST ?? '127.0.0.1';
const valkeyPort = parseInt(process.env.VALKEY_PORT ?? '6379');
const valkeyTls = String(process.env.VALKEY_TLS).toLowerCase() === 'true';

export const createCacheClient = () =>
  GlideClusterClient.createClient({
    addresses: [{ host: valkeyHost, port: valkeyPort }],
    useTLS: valkeyTls,
  });

export const withCache = async <T>(
  f: (cache: GlideClusterClient) => Promise<T>,
): Promise<T> => {
  const cache = await createCacheClient();
  try {
    return await f(cache);
  } catch (e) {
    console.error('withCache error:', e);
    throw e;
  } finally {
    cache.close();
  }
};

export interface Duration {
  unit: TimeUnit.UnixSeconds | TimeUnit.UnixMilliseconds;
  count: number;
}

export const composeKey = (segments: string[]) => segments.join(':');

export const makeKeyMap =
  <T extends Record<string, string>>(prefix: string[], suffixes: T) =>
  (id: string | number) => {
    const copy: Record<string, string> = {};
    for (const [key, suffix] of Object.entries(suffixes)) {
      const hashTag = [...prefix, String(id)].join(':');
      copy[key] = `{${hashTag}}:${suffix}`;
    }
    return copy as T;
  };

export type inferKeyMap<T> = T extends ReturnType<
  typeof makeKeyMap<infer U extends Record<string, string>>
>
  ? U
  : never;

const streamId = /^(\d+)-(\d+)$/;
const parseStreamId = (id: string): [number, number] => {
  const result = assertNonNull(streamId.exec(id), `streamId of ${id}`);
  return [parseInt(result[1]), parseInt(result[2])];
};

const compareStreamIds = (a: string, b: string): number => {
  const [a1, a2] = parseStreamId(a);
  const [b1, b2] = parseStreamId(b);
  if (a1 != b1) return a1 - b1;
  return a2 - b2;
};

export class VStream<T extends JSONObject> {
  private readonly cache: GlideClusterClient;
  private readonly streamKey: string;

  public constructor(cache: GlideClusterClient, streamKey: string) {
    this.cache = cache;
    this.streamKey = streamKey;
  }

  public async xadd(fields: T) {
    return this.cache.xadd(
      this.streamKey,
      Object.entries(fields).map(([field, value]) => [
        field,
        superjson.stringify(value),
      ]),
    );
  }

  public async xread(id: string | number = 0): Promise<[string, T][] | null> {
    const result = await this.cache.xread(
      { [this.streamKey]: String(id) },
      { block: 0 },
    );

    if (result === null) return null;
    const [{ value }] = result;
    return Object.entries(value)
      .sort(([idA], [idB]) => compareStreamIds(idA, idB))
      .map(([id, messageParts]) => {
        const entry: Partial<T> = {};
        for (const [messageField, messageValue] of messageParts) {
          const field = messageField as string as keyof T;
          entry[field] = superjson.parse<T[typeof field]>(
            messageValue as string,
          );
        }
        return [id, entry as T];
      });
  }
}
