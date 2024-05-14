import { stringifyError } from "./errors";
import { sleep } from "./time";

export type RetryConfig<T extends (...args: unknown[]) => Promise<unknown>> = {
  fn: T;
  fnName?: string;
  maxRetries: number;
  waitBetweenMs?: number;
  logger?: (msg: string) => void;
  backOff?: {
    backOffBase: number;
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function retry<T extends (...args: any[]) => Promise<unknown>>(
  config: RetryConfig<T>
) {
  if (config.maxRetries === 0) {
    throw new Error(
      `Setting 'config.maxRetries' to 0 will never call the underlying function`
    );
  }
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const fnName = config.fnName ?? config.fn.name;
    const error = new AggregateError(
      [],
      `Retry failed after ${config.maxRetries} attempts of ${fnName}`
    );
    for (let i = 0; i < config.maxRetries; i++) {
      try {
        return await (config.fn(...args) as Promise<ReturnType<T>>);
      } catch (e) {
        error.errors.push(e);

        if (config.logger) {
          config.logger(
            `Retry ${i + 1}/${config.maxRetries}; Function ${fnName} failed. ${stringifyError(e)}`
          );
        }

        // don't wait in the last iteration
        if (config.waitBetweenMs && i !== config.maxRetries - 1) {
          const sleepTimeBackOffMultiplier = config.backOff
            ? Math.pow(config.backOff.backOffBase, i)
            : 1;
          const sleepTime = config.waitBetweenMs * sleepTimeBackOffMultiplier;
          if (config.logger) {
            config.logger(
              `Waiting ${sleepTime / 1000} s. for the next retry...`
            );
          }

          await sleep(sleepTime);
        }
      }
    }
    throw error;
  };
}
