import { BigNumberish } from "ethers";
import _ from "lodash";
import { getS, stringifyError } from "../common";
import { getMedian, getMedianOfBigNumbers } from "../math";
import { ParallelExecutor } from "./ParallelExecutor";

export abstract class ConsensusExecutor<R> extends ParallelExecutor<R> {
  constructor(
    private readonly quorumRatio: number,
    timeoutMs?: number
  ) {
    super(timeoutMs);
  }

  protected override verifySettlements<R>(
    successfulResults: R[],
    errorResults: unknown[],
    totalLength: number
  ) {
    if (successfulResults.length + errorResults.length < totalLength) {
      this.logger.debug(
        `Returning, still doesn't have all of ${totalLength} results: ${successfulResults.length} successes + ${errorResults.length} errors`
      );
      return false;
    }

    const quorum = this.getQuorum(totalLength);

    if (successfulResults.length >= quorum) {
      return true;
    }

    const failedCount = errorResults.length;
    throw new Error(
      `Consensus failed: got ${successfulResults.length} successful result${getS(successfulResults.length)}, ` +
        `needed at least ${quorum}; ${stringifyError(new AggregateError(errorResults, `${failedCount} fail${getS(failedCount)}`))})`
    );
  }

  private getQuorum(totalLength: number) {
    return totalLength <= 2 ? 1 : Math.ceil(totalLength * this.quorumRatio);
  }
}

export class AllEqualConsensusExecutor<R> extends ConsensusExecutor<R> {
  override aggregate(results: R[]): R {
    const unique = _.uniqWith(results, (left, right) => _.isEqual(left, right));
    if (unique.length > 1) {
      throw new Error(
        `Results are not equal. Found ${unique.length} different results ${JSON.stringify(unique)}`
      );
    }

    return unique[0];
  }
}

export class MedianConsensusExecutor<R> extends ConsensusExecutor<R> {
  override aggregate(results: R[]): R {
    return MedianConsensusExecutor.getMedian(results);
  }

  static getMedian<R>(results: R[]) {
    const hasOnlyNumbers = results.every((n) => typeof n === "number");
    if (hasOnlyNumbers) {
      return getMedian(results as number[]) as R;
    }

    return getMedianOfBigNumbers(results as BigNumberish[]) as R;
  }
}
