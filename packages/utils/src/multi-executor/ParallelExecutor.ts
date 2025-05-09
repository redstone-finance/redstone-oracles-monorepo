import _ from "lodash";
import { stringify, stringifyError } from "../common";
import { AsyncFn, Executor } from "./Executor";

export abstract class ParallelExecutor<R> extends Executor<R> {
  protected constructor(protected timeoutMs?: number) {
    super();
  }

  protected static getModes<R>(results: R[]) {
    if (results.length === 0) {
      return undefined;
    }

    const uniqueElements = _.uniqWith(results, (left, right) =>
      _.isEqual(left, right)
    );
    const counts = uniqueElements.map((item) => ({
      item,
      count: results.filter((d) => _.isEqual(d, item)).length,
    }));

    const maxCount = _.maxBy(counts, "count")?.count ?? 0;

    return counts.filter((c) => c.count === maxCount);
  }

  protected abstract verifySettlements(
    successfulResults: R[],
    errorResults: unknown[],
    totalLength: number
  ): boolean;

  protected abstract aggregate(results: R[]): R;

  override async execute(functions: AsyncFn<R>[]): Promise<R> {
    return await new Promise((resolve, reject) => {
      const promises = Executor.getPromises(functions, this.timeoutMs);

      const successfulResults: R[] = [];
      const errorResults: unknown[] = [];
      const date = Date.now();
      let didFinish = false;

      promises.forEach((result, index) => {
        result
          .then((result) => {
            this.logger.debug(
              `Promise #${index} returns ${stringify(result)} in ${Date.now() - date} [ms]`
            );
            successfulResults.push(result);
          })
          .catch((error) => {
            this.logger.warn(
              `Promise #${index} failed: ${stringifyError(error)} in ${Date.now() - date} [ms]`,
              error
            );
            errorResults.push(error);
          })
          .finally(() => {
            didFinish ||= this.handleResults(
              successfulResults,
              errorResults,
              promises.length,
              resolve,
              reject
            );
          });
      });
    });
  }

  private handleResults(
    successfulResults: R[],
    errorResults: unknown[],
    totalLength: number,
    resolve: (value: PromiseLike<R> | R) => void,
    reject: (reason?: unknown) => void
  ) {
    try {
      const isEnough = this.verifySettlements(
        successfulResults,
        errorResults,
        totalLength
      );

      if (isEnough) {
        const value = this.aggregate(successfulResults);
        this.logger.debug(`Resolving with ${stringify(value)}`);
        resolve(value);
      }

      return isEnough;
    } catch (error) {
      reject(error);
      return true;
    }
  }
}
