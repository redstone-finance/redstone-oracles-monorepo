import { getS, stringify, stringifyError } from "../common";
import { ParallelExecutor } from "./ParallelExecutor";

export class AgreementExecutor<R> extends ParallelExecutor<R> {
  constructor(
    private readonly quorumNumber: number,
    timeoutMs: number | undefined,
    protected shouldResolveUnagreedToUndefined = false
  ) {
    super(timeoutMs);
  }

  public override aggregate(results: R[]): R {
    const modes = ParallelExecutor.getModes(results);
    this.logger.debug(`Found modes: ${stringify(modes)}`);

    if (!modes) {
      throw new Error(
        `That should've never happened but still...: ${stringify(modes)}`
      );
    }

    if (modes.length !== 1) {
      (this.shouldResolveUnagreedToUndefined
        ? this.logger.info
        : this.logger.warn)(
        `Multiple modes found (shouldResolveUnagreedToUndefined = ${this.shouldResolveUnagreedToUndefined}; were the returning promises sync?): ${stringify(modes)}`
      );

      if (this.shouldResolveUnagreedToUndefined) {
        return undefined as R;
      }
    }

    return modes[0].item;
  }

  public verifySettlements(
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
    if (this.shouldResolveUnagreedToUndefined) {
      return true; // Will be resolved to undefined
    }

    throw new Error(
      `Agreement failed: got max ${maxCount} equal result${getS(maxCount)}, ` +
        `needed at least ${quorum}` +
        (failedCount > 0
          ? `; ${stringifyError(new AggregateError(errorResults, `${failedCount} fail${getS(failedCount)}`))})`
          : "")
    );
  }

  protected getQuorum(totalLength: number) {
    return totalLength <= this.quorumNumber
      ? Math.min(1, this.quorumNumber)
      : this.quorumNumber;
  }
}
