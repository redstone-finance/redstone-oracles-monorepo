import { stringify, stringifyError, timeoutOrResult } from "../common";
import { loggerFactory } from "../logger";
import { FnBox } from "./FnBox";

const logger = loggerFactory("executor");

export abstract class Executor<R> {
  protected readonly logger = logger;

  static getPromises<R>(functions: FnBox<R>[], timeoutMs?: number) {
    const result = functions
      .filter((func) => !func.delegate?.isQuarantined?.(func))
      .map((func) => this.execFn(func, timeoutMs));

    if (!result.length) {
      throw new Error("All functions are quarantined. Cannot execute them!");
    }

    return result;
  }

  static async execFn<R>(func: FnBox<R>, timeoutMs?: number) {
    const { prefix, message, suffix } = this.makeLogData(func);

    if (func.delegate?.isQuarantined?.(func)) {
      throw new Error(
        `${prefix} tried to execute quarantined function... ${suffix}`
      );
    }

    try {
      const result = await timeoutOrResult(func.fn(), timeoutMs, "timed out");
      logger.debug(`${message("returns")}: ${stringify(result)}${suffix}`);
      func.delegate?.didSucceed?.(func, result);

      return result;
    } catch (error) {
      logger.warn(
        `${message("failed")}: ${stringifyError(error)}${suffix}`,
        error
      );
      func.delegate?.didFail?.(func, error);

      throw error;
    }
  }

  private static makeLogData<R>(func: FnBox<R>) {
    const date = Date.now();
    const prefix = `[${func.name}] Promise #${func.index}`;
    const message = (result: string) =>
      `${prefix} ${result} in ${Date.now() - date} [ms]`;
    const suffix = func.description ? ` (${func.description})` : "";

    return { prefix, message, suffix };
  }

  abstract execute(functions: FnBox<R>[]): Promise<R>;
}

/** TODO: Possible extensions
 * implement config overrides for methods
 * implement quorumRatio/Number as functions
 * change getModes to return single element (max or sth)
 * RaceExecutor can inherit from ParallelExecutor
 * Promise batching
 */
