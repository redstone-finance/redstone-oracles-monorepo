import { MedianConsensusExecutor } from "../../src/multi-executor";

const LOWEST = 1n;
const MIDDLE = 2n;
const HIGHEST = 3n;

describe("MedianConsensusExecutor", () => {
  it("picks the median of bigints as a bigint", () => {
    expect(MedianConsensusExecutor.getMedian([HIGHEST, LOWEST, MIDDLE])).toEqual(MIDDLE);
  });
});
