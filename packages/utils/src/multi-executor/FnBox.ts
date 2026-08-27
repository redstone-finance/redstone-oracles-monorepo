export type FnBox<R> = {
  fn: AsyncFn<R>;
  index: number;
  name: string;
  description?: string;
  delegate?: FnDelegate;
  shouldAbort?: () => boolean;
};

export interface FnDelegate {
  didFail?: <R>(fnBox: FnBox<R>, error: unknown, durationMs: number) => void;
  didSucceed?: <R>(fnBox: FnBox<R>, result: R, durationMs: number) => void;
  isQuarantined?: <R>(fnBox: FnBox<R>) => boolean;
  order?: <R>(fnBoxes: FnBox<R>[]) => FnBox<R>[];
}

type AsyncFn<R> = (shouldAbort: () => boolean) => Promise<R>;
