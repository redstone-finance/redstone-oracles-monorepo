import { MedianConsensusExecutor } from "./ConsensusExecutor";

export class CeilMedianConsensusExecutor extends MedianConsensusExecutor {
  override aggregate<R>(results: R[]): R {
    const value = super.aggregate(results) as number;

    return Math.ceil(value) as R;
  }
}
