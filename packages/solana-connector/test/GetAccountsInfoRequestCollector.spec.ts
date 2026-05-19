import {
  CollectableCommitmentOrConfig,
  GetAccountsInfoRequestCollector,
} from "../src/GetAccountsInfoRequestCollector";
import { makeAccountInfo, makePublicKey, MockDelegate } from "./test-helpers";

function setUp(commitmentOrConfig?: CollectableCommitmentOrConfig, collectingIntervalMs = 10) {
  const collector = new GetAccountsInfoRequestCollector(commitmentOrConfig, collectingIntervalMs);
  const delegate = new MockDelegate();
  collector.delegate = new WeakRef(delegate);

  return { sut: collector, delegate };
}

describe("GetAccountsInfoRequestCollector", () => {
  describe("delegate plumbing", () => {
    it("should reject when delegate is not set", async () => {
      const collector = new GetAccountsInfoRequestCollector(undefined, 5);

      await expect(collector.collectMany([makePublicKey(1)])).rejects.toThrow("Connection not set");
    });
  });

  describe("commitmentOrConfig forwarding to delegate", () => {
    it("forwards constructor's commitmentOrConfig to the delegate fetch call", async () => {
      const { sut, delegate } = setUp("finalized", 5);
      const key = makePublicKey(1);
      delegate.results.set(key.toBase58(), makeAccountInfo(1));

      await sut.collectMany([key]);

      expect(delegate.commitmentOrConfigs).toEqual(["finalized"]);
    });

    it("forwards undefined commitmentOrConfig to the delegate fetch call", async () => {
      const { sut, delegate } = setUp();
      const key = makePublicKey(1);
      delegate.results.set(key.toBase58(), makeAccountInfo(1));

      const result = await sut.collectMany([key]);

      expect(result).toEqual([makeAccountInfo(1)]);
      expect(delegate.commitmentOrConfigs).toEqual([undefined]);
    });

    it("forwards a structured commitmentOrConfig to the delegate fetch call", async () => {
      const { sut, delegate } = setUp({ commitment: "confirmed", minContextSlot: 7 }, 5);
      const key = makePublicKey(1);
      delegate.results.set(key.toBase58(), makeAccountInfo(1));

      const result = await sut.collectMany([key]);

      expect(result).toEqual([makeAccountInfo(1)]);
      expect(delegate.commitmentOrConfigs).toEqual([
        { commitment: "confirmed", minContextSlot: 7 },
      ]);
    });
  });

  describe("delegate dispose notification", () => {
    it("should call delegate.dispose after a successful flush", async () => {
      const { sut, delegate } = setUp(undefined, 5);
      const key = makePublicKey(1);
      delegate.results.set(key.toBase58(), makeAccountInfo(1));

      await sut.collectMany([key]);

      expect(delegate.disposeCalls).toEqual([undefined]);
    });

    it("should call delegate.dispose even when fetch fails", async () => {
      const { sut, delegate } = setUp(undefined, 5);
      delegate.rejectNext = new Error("RPC fail");

      await expect(sut.collectMany([makePublicKey(1)])).rejects.toThrow("RPC fail");

      expect(delegate.disposeCalls).toEqual([undefined]);
    });

    it("should pass own commitmentOrConfig to delegate.dispose", async () => {
      const { sut, delegate } = setUp("processed", 5);
      const key = makePublicKey(1);
      delegate.results.set(key.toBase58(), makeAccountInfo(1));

      await sut.collectMany([key]);

      expect(delegate.disposeCalls).toEqual(["processed"]);
    });
  });
});
