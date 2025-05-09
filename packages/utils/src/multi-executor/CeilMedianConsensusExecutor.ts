import { MedianConsensusExecutor } from "./ConsensusExecutor";

export class CeilMedianConsensusExecutor<
  R extends number,
> extends MedianConsensusExecutor<R> {
  override aggregate(results: R[]): R {
    const value = super.aggregate(results);

    return Math.ceil(value) as R;
  }
}
