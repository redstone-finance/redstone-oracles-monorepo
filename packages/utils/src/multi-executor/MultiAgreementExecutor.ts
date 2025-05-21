import _ from "lodash";
import { getS } from "../common";
import { AgreementExecutor } from "./AgreementExecutor";

/* That class is used to execute multiple agreements in parallel and then aggregate the result point by point.
   It requires all the results to be of the same length
*/
export class MultiAgreementExecutor<
  R extends unknown[],
> extends AgreementExecutor<(R | undefined)[]> {
  agreementExecutor: AgreementExecutor<R>;
  constructor(
    quorumNumber: number,
    timeoutMs: number | undefined,
    shouldResolveUnagreedToUndefined = false
  ) {
    super(quorumNumber, timeoutMs, shouldResolveUnagreedToUndefined);

    this.agreementExecutor = new AgreementExecutor(
      quorumNumber,
      timeoutMs,
      shouldResolveUnagreedToUndefined
    );
  }

  override aggregate(results: R[][]) {
    return (_.zip(...results) as R[][]).map((result) =>
      this.agreementExecutor.aggregate(result)
    );
  }

  override verifySettlements(
    successfulResults: R[][],
    errorResults: unknown[],
    totalLength: number
  ) {
    const quorum = this.getQuorum(totalLength);
    if (successfulResults.length < quorum) {
      if (successfulResults.length + errorResults.length === totalLength) {
        throw new Error(
          `MultiAgreement failed: got ${successfulResults.length} successful result${getS(successfulResults.length)}, ` +
            `needed at least ${quorum}`
        );
      }

      this.logger.debug(
        `Returning, still doesn't have enough of ${quorum} results: ${successfulResults.length} successes + ${errorResults.length} errors`
      );
      return false;
    }

    const partialSettlements = (_.zip(...successfulResults) as R[][]).map(
      (result) => {
        return this.agreementExecutor.verifySettlements(
          result,
          errorResults,
          totalLength
        );
      }
    );

    return !partialSettlements.includes(false);
  }
}
