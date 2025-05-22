type AsyncFn<R> = () => Promise<R>;

export type FnBox<R> = {
  fn: AsyncFn<R>;
  index: number;
  name: string;
  description?: string;
  delegate?: FnDelegate;
};

export interface FnDelegate {
  didFail?: <R>(fnBox: FnBox<R>, error: unknown) => void;
  didSucceed?: <R>(fnBox: FnBox<R>, result: R) => void;
  isQuarantined?: <R>(fnBox: FnBox<R>) => boolean;
}
