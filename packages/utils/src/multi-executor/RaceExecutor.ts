import _ from "lodash";
import { getS } from "../common";
import { Executor } from "./Executor";
import { FnBox } from "./FnBox";

export class RaceExecutor<R> extends Executor<R> {
  constructor(private readonly shouldFailWhenFastestFails: boolean = false) {
    super();
  }

  override async execute(functions: FnBox<R>[]): Promise<R> {
    const date = Date.now();
    const indexedPromises = Executor.getPromises(functions).map(
      (promise, index) => promise.then((result) => ({ index, result }))
    );
    const winner = await (this.shouldFailWhenFastestFails
      ? Promise.race(indexedPromises)
      : Promise.any(indexedPromises));

    this.logger.info(
      `Promise #${winner.index} won in ${Date.now() - date} [ms]`
    );

    void Promise.allSettled(indexedPromises).then((results) => {
      const failed = results
        .map((result, index) => ({ ...result, index }))
        .filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        this.logger.warn(
          `Race completed successfully, but ${failed.length} other promise${getS(failed.length)} failed:`,
          _.map(
            failed,
            (item) => `Promise #${item.index} failed: ${item.reason}`
          )
        );
      }
    });

    return winner.result;
  }
}
