import { FnBox, FnDelegate } from "./FnBox";

export class CompositeFnDelegate implements FnDelegate {
  constructor(private readonly delegates: FnDelegate[]) {}

  didFail<R>(fnBox: FnBox<R>, error: unknown, durationMs: number) {
    for (const delegate of this.delegates) {
      delegate.didFail?.(fnBox, error, durationMs);
    }
  }

  didSucceed<R>(fnBox: FnBox<R>, result: R, durationMs: number) {
    for (const delegate of this.delegates) {
      delegate.didSucceed?.(fnBox, result, durationMs);
    }
  }

  isQuarantined<R>(fnBox: FnBox<R>) {
    return this.delegates.some((delegate) => delegate.isQuarantined?.(fnBox) ?? false);
  }
}
