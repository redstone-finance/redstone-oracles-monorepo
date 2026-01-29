import { stringify } from "../common";
import { stringifyError } from "../common/errors";

export type Result<T, E = unknown> = Success<T> | Err<E>;

export type Success<T> = { success: true } & { ok: T };
export type Err<E> = { success: false } & { err: E };

export function isOk<T, E>(res: Result<T, E>): res is Success<T> {
  return res.success;
}

export function isErr<T, E>(res: Result<T, E>): res is Err<E> {
  return !isOk(res);
}

export function ok<T>(ok: T): Success<T> {
  return { success: true, ok };
}

export function err<E>(err: E): Err<E> {
  return { success: false, err };
}

export function mapUnsafe<T, E, U>(res: Result<T, E>, fn: (val: T) => U): Result<U, E>;
export function mapUnsafe<T, U>(fn: (val: T) => U): <E>(res: Result<T, E>) => Result<U, E>;
export function mapUnsafe<T, E, U>(resOrFn: Result<T, E> | ((val: T) => U), fn?: (val: T) => U) {
  if (typeof resOrFn === "function") {
    return <E>(res: Result<T, E>) => mapUnsafe(res, resOrFn);
  }

  if (isErr(resOrFn)) {
    return resOrFn;
  }

  return ok(fn!(resOrFn.ok));
}

export function map<T, E, U>(res: Result<T, E>, fn: (val: T) => U): Result<U, unknown> {
  const result = tryCall(() => mapUnsafe(res, fn));

  if (isOk(result)) {
    return result.ok;
  }

  return result;
}

export function mapStringifyError<T, E, U>(
  res: Result<T, E>,
  fn: (val: T) => U
): Result<U, string> {
  const result = map(res, fn);

  return mapErr(result, stringifyError);
}

export function mapErr<T, E, F>(res: Result<T, E>, fn: (err: E) => F): Result<T, F>;
export function mapErr<E, F>(fn: (err: E) => F): <T>(res: Result<T, E>) => Result<T, F>;
export function mapErr<T, E, F>(resOrFn: Result<T, E> | ((err: E) => F), fn?: (err: E) => F) {
  if (typeof resOrFn === "function") {
    return <T>(res: Result<T, E>) => mapErr(res, resOrFn);
  }

  if (isOk(resOrFn)) {
    return resOrFn;
  }

  return err(fn!(resOrFn.err));
}

async function mapAsyncUnsafe<T, E, U>(
  res: Result<T, E>,
  fn: (val: T) => Promise<U>
): Promise<Result<U, E>> {
  if (isErr(res)) {
    return res;
  }

  return ok(await fn(res.ok));
}

export async function mapAsync<T, E, U>(
  res: Result<T, E>,
  fn: (val: T) => Promise<U>
): Promise<Result<U, unknown>> {
  const result = await tryCallAsync(() => mapAsyncUnsafe(res, fn));

  if (isOk(result)) {
    return result.ok;
  }

  return result;
}

export async function mapAsyncStringifyError<T, E, U>(
  res: Result<T, E>,
  fn: (val: T) => Promise<U>
): Promise<Result<U, string>> {
  const result = await mapAsync(res, fn);

  return mapErr(result, stringifyError);
}

export function flatten<T, E>(res: Result<Result<T, E>, E>): Result<T, E> {
  if (isErr(res)) {
    return res;
  }

  return res.ok;
}

export async function tryAwait<T>(promise: Promise<T>): Promise<Result<T, unknown>> {
  try {
    return ok(await promise);
  } catch (e) {
    return err(e);
  }
}

export function tryCall<T>(fn: () => T): Result<T, unknown> {
  try {
    return ok(fn());
  } catch (e) {
    return err(e);
  }
}

export async function tryCallAsync<T>(fn: () => Promise<T>): Promise<Result<T, unknown>> {
  try {
    return ok(await fn());
  } catch (e) {
    return err(e);
  }
}

export function tryCallStringifyError<T>(fn: () => T): Result<T, string> {
  const res = tryCall(fn);

  return mapErr(res, stringifyError);
}

export async function tryCallAsyncStringifyError<T>(
  fn: () => Promise<T>
): Promise<Result<T, string>> {
  const res = await tryCallAsync(fn);

  return mapErr(res, stringifyError);
}

export function unwrapSuccess<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.ok;
  }

  throw new Error(`expected result to be ok variant: ${stringifyError(result.err)}`);
}

export function unwrapErr<T, E>(result: Result<T, E>): E {
  if (isErr(result)) {
    return result.err;
  }

  throw new Error(`expected result to be err variant: ${stringify(result.ok)}`);
}

export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isOk(result) ? result.ok : defaultValue;
}

export function unwrapOrElse<T, E, RT>(result: Result<T, E>, fn: (err: E) => RT): T | RT {
  return isOk(result) ? result.ok : fn(result.err);
}

export function findFirstApply<T, E>(fns: Iterable<() => Result<T, E>>): Result<T, E[]> {
  const errors: E[] = [];

  for (const fn of fns) {
    const result = fn();
    if (isOk(result)) {
      return result;
    }
    errors.push(result.err);
  }

  return err(errors);
}

export async function findFirstAsyncApply<T, E>(
  fns: Iterable<() => Promise<Result<T, E>>>
): Promise<Result<T, E[]>> {
  const errors: E[] = [];

  for (const fn of fns) {
    const result = await fn();
    if (isOk(result)) {
      return result;
    }
    errors.push(result.err);
  }

  return err(errors);
}

export function findFirst<T, E>() {
  return (fns: Iterable<() => Result<T, E>>) => findFirstApply(fns);
}

export function findFirstAsync<T, E>() {
  return async (fns: Iterable<() => Promise<Result<T, E>>>) => await findFirstAsyncApply(fns);
}

export function collectAll<R, E>(results: Result<R, E>[]) {
  const error = results.find(isErr);
  if (error) {
    return error;
  }
  return ok(results.map(unwrapSuccess));
}
