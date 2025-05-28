import _ from "lodash";
import { stringify } from "../common";
import { Executor } from "./Executor";
import { FnBox } from "./FnBox";

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

  override async execute(functions: FnBox<R>[]): Promise<R> {
    const promises = Executor.getPromises(functions, this.timeoutMs);

    const successfulResults: R[] = [];
    const errorResults: unknown[] = [];
    let didFinish = false;

    return await new Promise((resolve, reject) => {
      promises.forEach((result) => {
        result
          .then((result) => {
            successfulResults.push(result);
          })
          .catch((error) => {
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
