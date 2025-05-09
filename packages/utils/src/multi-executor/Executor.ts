import { timeoutOrResult } from "../common";
import { loggerFactory } from "../logger";

export type AsyncFn<R> = () => Promise<R>;

export abstract class Executor<R> {
  protected readonly logger = loggerFactory("executor");

  static getPromises<R>(functions: AsyncFn<R>[], timeoutMs?: number) {
    return functions.map((func) => timeoutOrResult(func(), timeoutMs));
  }

  abstract execute(functions: AsyncFn<R>[]): Promise<R>;
}

/** TODO: Possible extensions
 * implement instance names
 * implement config overrides for methods
 * implement quorumRatio/Number as functions
 * improve logging
 * improve error logging
 * add rpc curated list
 * change getModes to return single element (max or sth)
 * RateExecutor can inherit from ParallelExecutor
 * Promise batching
 */
