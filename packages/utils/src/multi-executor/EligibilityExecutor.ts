import { Executor } from "./Executor";
import { Eligibility, FnBox } from "./FnBox";

export class EligibilityExecutor<R> extends Executor<R> {
  constructor(
    private readonly executor: Executor<R>,
    private readonly isEligible: Eligibility
  ) {
    super();
  }

  override execute(functions: FnBox<R>[]) {
    return this.executor.execute(
      functions.map(({ isEligible, ...fnBox }) => ({
        ...fnBox,
        isEligible: isEligible
          ? (description: string) => isEligible(description) && this.isEligible(description)
          : this.isEligible,
      }))
    );
  }
}
