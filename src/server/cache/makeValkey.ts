import Valkey from 'iovalkey';

const valkeyUrl = process.env['VALKEY_URL'] ?? 'redis://localhost:6379';

export default function makeValkey(keyPrefix?: string) {
  return new Valkey(valkeyUrl, {
    keyPrefix,
  });
}

export const transformXReadResponse = (
  response: Awaited<ReturnType<typeof Valkey.prototype.xread>>,
): [string, [string, Record<string, string>][]][] | null =>
  response?.map(([key, entries]) => [
    key,
    entries.map(([entryId, messageParts]) => {
      const message: Record<string, string> = {};
      for (let i = 0; i < messageParts.length; i += 2) {
        message[messageParts[i]] = messageParts[i + 1];
      }
      return [entryId, message];
    }),
  ]) ?? null;
