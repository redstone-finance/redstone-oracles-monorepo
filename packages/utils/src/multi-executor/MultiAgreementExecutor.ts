import _ from "lodash";
import { AgreementExecutor } from "./AgreementExecutor";
import { ParallelExecutor } from "./ParallelExecutor";

/* That class is used to execute multiple agreements in parallel and then aggregate the result point by point.
   It requires all the results to be of the same length
*/
export class MultiAgreementExecutor<
  R extends unknown[],
> extends ParallelExecutor<(R | undefined)[]> {
  agreementExecutor: AgreementExecutor<R>;
  constructor(
    quorumNumber: number,
    timeoutMs: number | undefined,
    shouldResolveUnagreedToUndefined = false
  ) {
    super(timeoutMs);

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
