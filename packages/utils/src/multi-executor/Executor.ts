import { loggerFactory } from "../logger";

export type AsyncFn<R> = () => Promise<R>;

export abstract class Executor {
  protected readonly logger = loggerFactory("executor");

  static getPromises<R>(functions: AsyncFn<R>[]) {
    return functions.map((func) => func());
  }

  abstract execute<R>(functions: AsyncFn<R>[]): Promise<R>;
}
