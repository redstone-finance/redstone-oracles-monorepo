import { getS, stringify, stringifyError } from "../common";
import { ParallelExecutor } from "./ParallelExecutor";

export class AgreementExecutor extends ParallelExecutor {
  constructor(
    private quorumNumber: number,
    timeoutMs?: number
  ) {
    super(timeoutMs);
  }

  protected override aggregate<R>(results: R[]): R {
    const modes = ParallelExecutor.getModes(results);
    this.logger.info(`Found modes: ${stringify(modes)}`);

    if (!modes) {
      throw new Error(
        `That should've never happened but still...: ${stringify(modes)}`
      );
    }

    if (modes.length !== 1) {
      this.logger.warn(
        `Multiple modes found (were the returning promises sync?): ${stringify(modes)}`
      );
    }

    return modes[0].item;
  }

  protected verifySettlements<R>(
    successfulResults: R[],
    errorResults: unknown[],
    totalLength: number
  ) {
    const modes = ParallelExecutor.getModes(successfulResults);
    const quorum = this.getQuorum(totalLength);
    const maxCount = modes?.[0]?.count ?? 0;
    const isEnough = maxCount >= quorum;

    if (isEnough) {
      return true;
    }

    if (successfulResults.length + errorResults.length < totalLength) {
      this.logger.debug(
        `Returning, still doesn't have enough of ${quorum} results: ${successfulResults.length} successes + ${errorResults.length} errors`
      );
      return false;
    }

    this.logger.debug("Successful results:", successfulResults);

    const failedCount = errorResults.length;
    throw new Error(
      `Agreement failed: got max ${maxCount} equal result${getS(maxCount)}, ` +
        `needed at least ${quorum}` +
        (failedCount > 0
          ? `; ${stringifyError(new AggregateError(errorResults, `${failedCount} fail${getS(failedCount)}`))})`
          : "")
    );
  }

  private getQuorum(totalLength: number) {
    return Math.min(Math.max(totalLength, 1), this.quorumNumber);
  }
}
