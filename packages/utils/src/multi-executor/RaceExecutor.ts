import _ from "lodash";
import { getS } from "../common";
import { AsyncFn, Executor } from "./Executor";

export class RaceExecutor extends Executor {
  constructor(private shouldFailWhenFastestFails: boolean = false) {
    super();
  }

  override async execute<R>(functions: AsyncFn<R>[]): Promise<R> {
    const promises = Executor.getPromises(functions);
    const winner = await (this.shouldFailWhenFastestFails
      ? Promise.race(promises)
      : Promise.any(promises));

    void Promise.allSettled(promises).then((results) => {
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        this.logger.warn(
          `Race completed successfully but ${failed.length} other promise${getS(failed.length)} failed:`,
          _.map(failed, "reason")
        );
      }
    });

    return winner;
  }
}
