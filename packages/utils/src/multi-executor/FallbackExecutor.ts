import { Executor } from "./Executor";
import { FnBox } from "./FnBox";

export class FallbackExecutor<R> extends Executor<R> {
  constructor(private readonly timeoutMs?: number) {
    super();
  }

  public async execute(functions: FnBox<R>[]): Promise<R> {
    const errors = [];

    for (const func of functions) {
      try {
        return await Executor.execFn(func, this.timeoutMs);
      } catch (error) {
        errors.push(error);
      }
    }

    throw new AggregateError(errors, "All promises failed");
  }
}
