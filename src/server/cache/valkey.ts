import Valkey from 'iovalkey';

export function newValkeyInstance(url?: string) {
  return new Valkey(
    url ?? process.env['VALKEY_URL'] ?? 'redis://localhost:6379',
  );
}

const valkey = newValkeyInstance();
export default valkey;
