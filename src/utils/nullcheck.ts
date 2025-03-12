const assertNonNull = <T, D extends string>(t: T | null, desc: D): T => {
  if (t === null) {
    throw new Error(`Expected ${desc} to be non-null`);
  }
  return t;
};

export const assertRequired = <T extends object>(
  t: T,
): {
  [P in keyof T]: NonNullable<T[P]>;
} => {
  if (Object.values(t).includes(null)) {
    throw new Error(`Object has null property`);
  }
  return t as { [P in keyof T]: NonNullable<T[P]> };
};

export default assertNonNull;
