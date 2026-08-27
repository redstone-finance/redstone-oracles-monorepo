import { Executor } from "./Executor";
import { FnBox } from "./FnBox";

const FALLBACK_FAILED_MESSAGE = "All promises failed";

export class FallbackExecutor<R> extends Executor<R> {
  constructor(private readonly timeoutMs?: number) {
    super();
  }

  public async execute(functions: FnBox<R>[]): Promise<R> {
    const errors = [];

    for (const func of Executor.inDelegateOrder(functions)) {
      try {
        return await Executor.execFn(func, this.timeoutMs);
      } catch (error) {
        errors.push(error);
      }
    }

    throw this.failure(errors);
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- subclasses report the failure in the shape their callers match on
  protected failure(errors: unknown[]): Error {
    return new AggregateError(errors, FALLBACK_FAILED_MESSAGE);
  }
}
