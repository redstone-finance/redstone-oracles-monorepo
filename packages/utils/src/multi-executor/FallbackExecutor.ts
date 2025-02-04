import { timeoutOrResult } from "../common";
import { AsyncFn, Executor } from "./Executor";

export class FallbackExecutor extends Executor {
  constructor(private readonly timeoutMs?: number) {
    super();
  }

  public async execute<R>(functions: AsyncFn<R>[]): Promise<R> {
    const errors = [];

    for (const func of functions) {
      try {
        return await timeoutOrResult(func(), this.timeoutMs);
      } catch (error) {
        errors.push(error);
      }
    }

    throw new AggregateError(errors, "All promises failed");
  }
}
