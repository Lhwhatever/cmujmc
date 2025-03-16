export function indexByKey<
  T extends Record<string, unknown>,
  K extends keyof T,
>(collection: T[], key: K): Map<T[K], T> {
  const map = new Map<T[K], T>();
  for (const item of collection) {
    map.set(item[key], item);
  }
  return map;
}
