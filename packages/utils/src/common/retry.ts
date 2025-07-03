import { loggerFactory } from "../logger";
import { stringifyError } from "./errors";
import { sleep } from "./time";

const logger = loggerFactory("retry");

export type RetryConfig<
  P extends unknown[] = [],
  R extends Promise<unknown> = Promise<unknown>,
> = {
  fn: (...args: P) => R;
  fnName?: string;
  maxRetries: number;
  waitBetweenMs?: number;
  logger?: (message: string) => void;
  backOff?: {
    backOffBase: number;
  };
};

export function retry<P extends unknown[], R extends Promise<unknown>>(
  config: RetryConfig<P, R>
) {
  if (config.maxRetries === 0) {
    throw new Error(
      `Setting 'config.maxRetries' to 0 will never call the underlying function`
    );
  }
  return async (...args: P): Promise<Awaited<R>> => {
    const fnName = config.fnName ?? config.fn.name;
    const errors = [];
    for (let i = 0; i < config.maxRetries; i++) {
      try {
        return await config.fn(...args);
      } catch (e) {
        errors.push(e);

        config.logger?.(
          `Retry ${i + 1}/${config.maxRetries}; Function ${fnName} failed. ${stringifyError(e)}`
        );

        // don't wait in the last iteration
        if (config.waitBetweenMs && i !== config.maxRetries - 1) {
          const sleepTimeBackOffMultiplier = config.backOff
            ? Math.pow(config.backOff.backOffBase, i)
            : 1;
          const sleepTime = config.waitBetweenMs * sleepTimeBackOffMultiplier;
          config.logger?.(
            `Waiting ${sleepTime / 1000} s. for the next retry...`
          );

          await sleep(sleepTime);
        }
      }
    }
    throw new AggregateError(
      errors,
      `Retry failed after ${config.maxRetries} attempts of ${fnName}`
    );
  };
}

export const waitForSuccess = async (
  cond: (iterationIndex?: number) => Promise<boolean>,
  count: number,
  errorMessage: string,
  sleepTimeMs = 5000,
  description = ""
) => {
  const logPrefix = description ? `[${description}] ` : "";
  let waitCounter = 0;
  while (!(await cond(waitCounter))) {
    if (++waitCounter < count) {
      logger.debug(`${logPrefix}Waiting ${sleepTimeMs} [ms]...`);
      await sleep(sleepTimeMs);
    } else {
      throw new Error(errorMessage);
    }
  }

  if (!waitCounter) {
    return;
  }

  logger.log(`${logPrefix}Did wait ${sleepTimeMs * waitCounter} [ms] in total`);
};
