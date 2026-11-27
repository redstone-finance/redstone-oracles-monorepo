import { getCeilMedianOfBigInts } from "../math";
import { MedianConsensusExecutor } from "./ConsensusExecutor";

export class CeilMedianConsensusExecutor<
  R extends number | bigint,
> extends MedianConsensusExecutor<R> {
  override aggregate(results: R[]): R {
    return CeilMedianConsensusExecutor.getMedian(results);
  }

  static override getMedian<R>(results: R[]) {
    const hasOnlyBigInts = results.every((n) => typeof n === "bigint");
    if (hasOnlyBigInts) {
      return getCeilMedianOfBigInts(results) as R;
    }

    return Math.ceil(MedianConsensusExecutor.getMedian(results) as number) as R;
  }
}
