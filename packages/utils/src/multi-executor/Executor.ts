import { stringify, stringifyError, timeoutOrResult } from "../common";
import { loggerFactory } from "../logger";

export type AsyncFn<R> = () => Promise<R>;

export type FnBox<R> = {
  fn: AsyncFn<R>;
  index: number;
  name: string;
  description?: string;
};

const logger = loggerFactory("executor");

export abstract class Executor<R> {
  protected readonly logger = logger;

  static getPromises<R>(functions: FnBox<R>[], timeoutMs?: number) {
    return functions.map((func) => this.execFn(func, timeoutMs));
  }

  static async execFn<R>(func: FnBox<R>, timeoutMs?: number) {
    const date = Date.now();
    const prefix = (result: string) =>
      `[${func.name}] Promise #${func.index} ${result} in ${Date.now() - date} [ms]`;
    const suffix = func.description ? ` (${func.description})` : "";

    try {
      const result = await timeoutOrResult(func.fn(), timeoutMs, "timed out");
      logger.debug(`${prefix("returns")}: ${stringify(result)}${suffix}`);
      return result;
    } catch (error) {
      logger.warn(
        `${prefix("failed")}: ${stringifyError(error)}${suffix}`,
        error
      );

      throw error;
    }
  }

  abstract execute(functions: FnBox<R>[]): Promise<R>;
}

/** TODO: Possible extensions
 * implement config overrides for methods
 * implement quorumRatio/Number as functions
 * add rpc curated list
 * change getModes to return single element (max or sth)
 * RaceExecutor can inherit from ParallelExecutor
 * Promise batching
 */
