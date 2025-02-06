import { BigNumberish } from "ethers";
import _ from "lodash";
import { getS, stringifyError } from "../common";
import { getMedian, getMedianOfBigNumbers } from "../math";
import { AsyncFn, Executor } from "./Executor";

export abstract class ConsensusExecutor extends Executor {
  constructor(private quorumRatio: number) {
    super();
  }

  abstract check<R>(results: R[]): R;

  override async execute<R>(functions: AsyncFn<R>[]): Promise<R> {
    const settlements = await Promise.allSettled(
      Executor.getPromises(functions)
    );
    const successfulResults = settlements
      .filter(
        (s): s is PromiseFulfilledResult<Awaited<R>> => s.status === "fulfilled"
      )
      .map((s) => s.value);

    const errorResults = settlements
      .filter((s): s is PromiseRejectedResult => s.status === "rejected")
      .map((s) => s.reason as Error);

    const quorum = Math.ceil(functions.length * this.quorumRatio);
    if (successfulResults.length < quorum) {
      const failedCount = settlements.length - successfulResults.length;
      throw new Error(
        `Consensus failed: got ${successfulResults.length} successful result${getS(successfulResults.length)}, ` +
          `needed at least ${quorum} (${failedCount} failed with ${stringifyError(new AggregateError(errorResults))})`
      );
    }

    if (successfulResults.length === 0) {
      throw new Error("No successful results available");
    }

    return this.check(successfulResults);
  }
}

export class AllEqualsConsensusExecutor extends ConsensusExecutor {
  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  check<R>(results: R[]): R {
    const unique = _.uniqWith(results, (left, right) => _.isEqual(left, right));
    if (unique.length > 1) {
      throw new Error(
        `Results are not equal. Found ${unique.length} different results ${JSON.stringify(unique)}`
      );
    }

    return unique[0];
  }
}

export class MedianConsensusExecutor extends ConsensusExecutor {
  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  check<R>(results: R[]): R {
    const hasOnlyNumbers = results.every((n) => typeof n === "number");
    if (hasOnlyNumbers) {
      return getMedian(results as number[]) as R;
    }

    return getMedianOfBigNumbers(results as BigNumberish[]) as R;
  }
}
