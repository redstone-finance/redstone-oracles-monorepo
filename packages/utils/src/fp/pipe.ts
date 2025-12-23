export function pipe<A>(value: A): A;
export function pipe<A, B>(value: A, ab: (a: A) => B): B;
export function pipe<A, B, C>(value: A, ab: (a: A) => B, bc: (b: B) => C): C;
export function pipe<A, B, C, D>(value: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): D;

export function pipe(value: unknown, ...fns: Array<(arg: unknown) => unknown>): unknown {
  let current = value;
  for (const fn of fns) {
    current = fn(current);
  }
  return current;
}

export function curried<T, P extends Array<unknown>, R>(fn: (data: T, ...params: P) => R) {
  return (...params: P) =>
    (data: T) =>
      fn(data, ...params);
}
