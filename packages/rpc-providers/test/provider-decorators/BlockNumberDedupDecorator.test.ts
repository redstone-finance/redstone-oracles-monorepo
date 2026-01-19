import { RedstoneCommon } from "@redstone-finance/utils";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { providers } from "ethers";
import sinon from "sinon";
import { BlockNumberDedupDecorator } from "../../src/provider-decorators/BlockNumberDedupDecorator";

chai.use(chaiAsPromised);

function createMockProvider(getBlockNumberImpl: () => Promise<number>): providers.Provider {
  return {
    getBlockNumber: getBlockNumberImpl,
  } as providers.Provider;
}

describe("BlockNumberDedupDecorator", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should deduplicate concurrent getBlockNumber calls", async () => {
    let callCount = 0;
    let resolvePromise: (value: number) => void;
    const wantCalls = 1;
    const wantValue = 100;

    const mockProvider = createMockProvider(() => {
      callCount++;
      return new Promise<number>((resolve) => {
        resolvePromise = resolve;
      });
    });

    const decoratedProvider = BlockNumberDedupDecorator(() => mockProvider)();

    // Start 3 concurrent calls
    const promise1 = decoratedProvider.getBlockNumber();
    const promise2 = decoratedProvider.getBlockNumber();
    const promise3 = decoratedProvider.getBlockNumber();

    expect(callCount).to.equal(wantCalls);

    resolvePromise!(wantValue);

    const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

    expect(result1).to.equal(wantValue);
    expect(result2).to.equal(wantValue);
    expect(result3).to.equal(wantValue);
    expect(callCount).to.equal(wantCalls);
  });

  it("should make new calls after previous one completes", async () => {
    let callCount = 0;

    const mockProvider = createMockProvider(() => {
      callCount++;
      return new Promise<number>((resolve) => resolve(100 + callCount));
    });

    const decoratedProvider = BlockNumberDedupDecorator(() => mockProvider)();

    const result1 = await decoratedProvider.getBlockNumber();
    expect(result1).to.equal(101);
    expect(callCount).to.equal(1);

    const result2 = await decoratedProvider.getBlockNumber();
    expect(result2).to.equal(102);
    expect(callCount).to.equal(2);

    const result3 = await decoratedProvider.getBlockNumber();
    expect(result3).to.equal(103);
    expect(callCount).to.equal(3);
  });

  it("should propagate errors to all concurrent callers", async () => {
    let callCount = 0;
    let rejectPromise: (error: Error) => void;

    const mockProvider = createMockProvider(() => {
      callCount++;
      return new Promise<number>((_resolve, reject) => {
        rejectPromise = reject;
      });
    });

    const decoratedProvider = BlockNumberDedupDecorator(() => mockProvider)();

    const promise1 = decoratedProvider.getBlockNumber();
    const promise2 = decoratedProvider.getBlockNumber();

    expect(callCount).to.equal(1);

    rejectPromise!(new Error("Network error"));

    await expect(promise1).to.be.rejectedWith("Network error");
    await expect(promise2).to.be.rejectedWith("Network error");
  });

  it("should allow new calls after error", async () => {
    let callCount = 0;

    const mockProvider = createMockProvider(() => {
      callCount++;
      if (callCount === 1) {
        throw new Error("First call fails");
      }
      return new Promise<number>((resolve) => resolve(100));
    });

    const decoratedProvider = BlockNumberDedupDecorator(() => mockProvider)();

    await expect(decoratedProvider.getBlockNumber()).to.be.rejectedWith("First call fails");
    expect(callCount).to.equal(1);

    const result = await decoratedProvider.getBlockNumber();
    expect(result).to.equal(100);
    expect(callCount).to.equal(2);
  });

  it("should handle rapid sequential calls correctly", async () => {
    let callCount = 0;
    const smallDelayMS = 10;

    const mockProvider = createMockProvider(async () => {
      callCount++;
      await RedstoneCommon.sleep(smallDelayMS);
      return callCount * 10;
    });

    const decoratedProvider = BlockNumberDedupDecorator(() => mockProvider)();

    const promise1 = decoratedProvider.getBlockNumber();
    const promise2 = decoratedProvider.getBlockNumber();

    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(result1).to.equal(10);
    expect(result2).to.equal(10);
    expect(callCount).to.equal(1);

    const result3 = await decoratedProvider.getBlockNumber();
    expect(result3).to.equal(20);
    expect(callCount).to.equal(2);
  });
});
