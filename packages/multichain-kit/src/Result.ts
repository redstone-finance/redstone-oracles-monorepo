import { RedstoneCommon } from "@redstone-finance/utils";

export type SuccessResult<T> = { success: true } & { ok: T };

export type ErrorResult<E> = { success: false } & { err: E };

export type Result<T, E> = SuccessResult<T> | ErrorResult<E>;

export function ok<T>(ok: T): SuccessResult<T> {
  return { success: true, ok };
}

export function err<E>(err: E): ErrorResult<E> {
  return { success: false, err };
}

export function unwrapSuccess<T, E>(result: Result<T, E>): T {
  if (result.success) {
    return result.ok;
  }

  throw new Error(RedstoneCommon.stringifyError(result.err));
}
