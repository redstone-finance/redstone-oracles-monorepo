import {
  Commitment,
  Connection,
  EpochInfo,
  GetAccountInfoConfig,
  PublicKey,
} from "@solana/web3.js";
import { RedStoneConnection } from "../src";
import { MOCK_CONTEXT_SLOT, makeAccountInfo, makePublicKey } from "./test-helpers";

const MOCK_SLOT = 123456;
const CONFIRMED: Commitment = "confirmed";
const FINALIZED: Commitment = "finalized";
const EARLIER_CONTEXT_SLOT = MOCK_CONTEXT_SLOT - 1;
const SOLANA_MAX_ACCOUNTS_PER_CALL = 100;
const OVERFLOW_KEY_COUNT = SOLANA_MAX_ACCOUNTS_PER_CALL + 1;
const OVERFLOW_KEYS = Array.from({ length: OVERFLOW_KEY_COUNT }, (_, index) =>
  makePublicKey(index + 1)
);
const MOCK_EPOCH_INFO: EpochInfo = {
  epoch: 42,
  slotIndex: 100,
  slotsInEpoch: 432000,
  absoluteSlot: 123456,
  blockHeight: 99999,
};

function setUp() {
  const connection = new RedStoneConnection("http://localhost:8899");

  function mockAccountsResponse(publicKeys: PublicKey[], slot: number) {
    return Promise.resolve({
      context: { slot },
      value: publicKeys.map((pk) => {
        const byte = pk.toBuffer().readUInt32BE(0);

        return byte > 0 ? makeAccountInfo(byte) : null;
      }),
    });
  }

  const superGetMultipleAccountsInfoAndContext = jest
    .spyOn(Connection.prototype, "getMultipleAccountsInfoAndContext")
    .mockImplementation(
      (publicKeys: PublicKey[], _commitmentOrConfig?: Commitment | GetAccountInfoConfig) =>
        mockAccountsResponse(publicKeys, MOCK_CONTEXT_SLOT)
    );

  const superGetAccountInfoAndContext = jest
    .spyOn(Connection.prototype, "getAccountInfoAndContext")
    .mockRejectedValue(new Error("RPC call bypassed the collector"));

  const superGetEpochInfo = jest
    .spyOn(Connection.prototype, "getEpochInfo")
    .mockResolvedValue(MOCK_EPOCH_INFO);

  const superGetSlot = jest.spyOn(Connection.prototype, "getSlot").mockResolvedValue(MOCK_SLOT);

  return {
    sut: connection,
    mockAccountsResponse,
    superGetMultipleAccountsInfoAndContext,
    superGetAccountInfoAndContext,
    superGetEpochInfo,
    superGetSlot,
  };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("RedStoneConnection", () => {
  describe("getMultipleAccountsInfo", () => {
    it("should delegate to collector when no commitmentOrConfig", async () => {
      const { sut, superGetMultipleAccountsInfoAndContext } = setUp();
      const keys = [makePublicKey(1), makePublicKey(2)];

      const result = await sut.getMultipleAccountsInfo(keys);

      expect(result).toEqual([makeAccountInfo(1), makeAccountInfo(2)]);
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledTimes(1);
    });

    it("should run collector even when commitmentOrConfig is set", async () => {
      const { sut, superGetMultipleAccountsInfoAndContext } = setUp();
      const keys = [makePublicKey(1)];

      const result = await sut.getMultipleAccountsInfo(keys, CONFIRMED);

      expect(result).toEqual([makeAccountInfo(1)]);
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledWith(keys, CONFIRMED);
    });

    it("should batch concurrent calls through collector", async () => {
      const { sut, superGetMultipleAccountsInfoAndContext } = setUp();

      const [r1, r2] = await Promise.all([
        sut.getMultipleAccountsInfo([makePublicKey(1)]),
        sut.getMultipleAccountsInfo([makePublicKey(2)]),
      ]);

      expect(r1).toEqual([makeAccountInfo(1)]);
      expect(r2).toEqual([makeAccountInfo(2)]);
      // Both batched into single super call
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledTimes(1);
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledWith(
        [makePublicKey(1), makePublicKey(2)],
        undefined
      );
    });
  });

  describe("getAccountInfo", () => {
    it("should delegate single key through collector", async () => {
      const { sut, superGetMultipleAccountsInfoAndContext } = setUp();

      const result = await sut.getAccountInfo(makePublicKey(5));

      expect(result).toEqual(makeAccountInfo(5));
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledTimes(1);
    });

    it("should return null for missing account", async () => {
      const { sut } = setUp();

      const result = await sut.getAccountInfo(makePublicKey(0));

      expect(result).toBeNull();
    });

    it("should route through collector and forward commitmentOrConfig to super.getMultipleAccountsInfoAndContext", async () => {
      const { sut, superGetAccountInfoAndContext, superGetMultipleAccountsInfoAndContext } =
        setUp();

      const result = await sut.getAccountInfo(makePublicKey(3), FINALIZED);

      expect(result).toEqual(makeAccountInfo(3));
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledWith(
        [makePublicKey(3)],
        FINALIZED
      );
      expect(superGetAccountInfoAndContext).not.toHaveBeenCalled();
    });

    it("should batch getAccountInfo with getMultipleAccountsInfo through collector", async () => {
      const { sut, superGetMultipleAccountsInfoAndContext } = setUp();

      const [single, multi] = await Promise.all([
        sut.getAccountInfo(makePublicKey(1)),
        sut.getMultipleAccountsInfo([makePublicKey(2), makePublicKey(3)]),
      ]);

      expect(single).toEqual(makeAccountInfo(1));
      expect(multi).toEqual([makeAccountInfo(2), makeAccountInfo(3)]);
      // All batched into one call
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledTimes(1);
    });
  });

  describe("getAccountInfoAndContext", () => {
    it("should return the account with the slot of its batch", async () => {
      const { sut, superGetAccountInfoAndContext, superGetMultipleAccountsInfoAndContext } =
        setUp();

      const result = await sut.getAccountInfoAndContext(makePublicKey(5));

      expect(result).toEqual({ context: { slot: MOCK_CONTEXT_SLOT }, value: makeAccountInfo(5) });
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledWith(
        [makePublicKey(5)],
        undefined
      );
      expect(superGetAccountInfoAndContext).not.toHaveBeenCalled();
    });

    it("should batch getAccountInfoAndContext with getMultipleAccountsInfo through collector", async () => {
      const { sut, superGetMultipleAccountsInfoAndContext } = setUp();

      const [single, multi] = await Promise.all([
        sut.getAccountInfoAndContext(makePublicKey(1)),
        sut.getMultipleAccountsInfo([makePublicKey(2)]),
      ]);

      expect(single).toEqual({ context: { slot: MOCK_CONTEXT_SLOT }, value: makeAccountInfo(1) });
      expect(multi).toEqual([makeAccountInfo(2)]);
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledTimes(1);
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledWith(
        [makePublicKey(1), makePublicKey(2)],
        undefined
      );
    });
  });

  describe("getMultipleAccountsInfoAndContext", () => {
    it("should return the accounts with the slot of their batch", async () => {
      const { sut } = setUp();

      const result = await sut.getMultipleAccountsInfoAndContext([
        makePublicKey(1),
        makePublicKey(0),
      ]);

      expect(result).toEqual({
        context: { slot: MOCK_CONTEXT_SLOT },
        value: [makeAccountInfo(1), null],
      });
    });

    it("should report the lowest slot when the keys span several batches", async () => {
      const { sut, mockAccountsResponse, superGetMultipleAccountsInfoAndContext } = setUp();
      superGetMultipleAccountsInfoAndContext.mockImplementationOnce((publicKeys: PublicKey[]) =>
        mockAccountsResponse(publicKeys, EARLIER_CONTEXT_SLOT)
      );

      const result = await sut.getMultipleAccountsInfoAndContext(OVERFLOW_KEYS);

      expect(result).toEqual({
        context: { slot: EARLIER_CONTEXT_SLOT },
        value: OVERFLOW_KEYS.map((_, index) => makeAccountInfo(index + 1)),
      });
    });

    it("should warn when the keys span several slots", async () => {
      const { sut, mockAccountsResponse, superGetMultipleAccountsInfoAndContext } = setUp();
      superGetMultipleAccountsInfoAndContext.mockImplementationOnce((publicKeys: PublicKey[]) =>
        mockAccountsResponse(publicKeys, EARLIER_CONTEXT_SLOT)
      );
      const warn = jest.spyOn(sut["logger"], "warn");

      await sut.getMultipleAccountsInfoAndContext(OVERFLOW_KEYS);

      expect(warn).toHaveBeenCalledWith(
        `getMultipleAccountsInfoAndContext read ${OVERFLOW_KEY_COUNT} accounts in 2 slots (${EARLIER_CONTEXT_SLOT}, ${MOCK_CONTEXT_SLOT}), reporting the lowest`
      );
    });

    it("should ask the RPC directly for an empty key list", async () => {
      const { sut, superGetMultipleAccountsInfoAndContext } = setUp();

      const result = await sut.getMultipleAccountsInfoAndContext([]);

      expect(result).toEqual({ context: { slot: MOCK_CONTEXT_SLOT }, value: [] });
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledWith([], undefined);
    });
  });

  describe("getEpochInfo", () => {
    it("should return epoch info", async () => {
      const { sut, superGetEpochInfo } = setUp();

      const result = await sut.getEpochInfo();

      expect(result).toEqual(MOCK_EPOCH_INFO);
      expect(superGetEpochInfo).toHaveBeenCalledTimes(1);
    });

    it("should bypass caching when commitmentOrConfig is set", async () => {
      const { sut, superGetEpochInfo } = setUp();

      await sut.getEpochInfo(FINALIZED);

      expect(superGetEpochInfo).toHaveBeenCalledWith(FINALIZED);
    });

    it("should deduplicate concurrent getEpochInfo calls", async () => {
      const { sut, superGetEpochInfo } = setUp();

      const [r1, r2, r3] = await Promise.all([
        sut.getEpochInfo(),
        sut.getEpochInfo(),
        sut.getEpochInfo(),
      ]);

      expect(r1).toEqual(MOCK_EPOCH_INFO);
      expect(r2).toEqual(MOCK_EPOCH_INFO);
      expect(r3).toEqual(MOCK_EPOCH_INFO);
      expect(superGetEpochInfo).toHaveBeenCalledTimes(1);
    });

    it("should NOT deduplicate when commitmentOrConfig is set", async () => {
      const { sut, superGetEpochInfo } = setUp();

      await Promise.all([sut.getEpochInfo(CONFIRMED), sut.getEpochInfo(CONFIRMED)]);

      expect(superGetEpochInfo).toHaveBeenCalledTimes(2);
    });

    it("should allow new call after previous one resolves", async () => {
      const { sut, superGetEpochInfo } = setUp();

      await sut.getEpochInfo();
      await sut.getEpochInfo();

      expect(superGetEpochInfo).toHaveBeenCalledTimes(2);
    });

    it("should clear cache after rejection and allow retry", async () => {
      const { sut, superGetEpochInfo } = setUp();

      superGetEpochInfo.mockRejectedValueOnce(new Error("RPC fail"));

      await expect(sut.getEpochInfo()).rejects.toThrow("RPC fail");

      superGetEpochInfo.mockResolvedValueOnce(MOCK_EPOCH_INFO);
      const result = await sut.getEpochInfo();

      expect(result).toEqual(MOCK_EPOCH_INFO);
    });
  });

  describe("getSlot", () => {
    it("should return slot", async () => {
      const { sut, superGetSlot } = setUp();

      const result = await sut.getSlot();

      expect(result).toBe(MOCK_SLOT);
      expect(superGetSlot).toHaveBeenCalledTimes(1);
    });

    it("should bypass caching when commitmentOrConfig is set", async () => {
      const { sut, superGetSlot } = setUp();

      await sut.getSlot(FINALIZED);

      expect(superGetSlot).toHaveBeenCalledWith(FINALIZED);
    });

    it("should deduplicate concurrent getSlot calls", async () => {
      const { sut, superGetSlot } = setUp();

      const [r1, r2, r3] = await Promise.all([sut.getSlot(), sut.getSlot(), sut.getSlot()]);

      expect(r1).toBe(MOCK_SLOT);
      expect(r2).toBe(MOCK_SLOT);
      expect(r3).toBe(MOCK_SLOT);
      expect(superGetSlot).toHaveBeenCalledTimes(1);
    });

    it("should NOT deduplicate when commitmentOrConfig is set", async () => {
      const { sut, superGetSlot } = setUp();

      await Promise.all([sut.getSlot(CONFIRMED), sut.getSlot(CONFIRMED)]);

      expect(superGetSlot).toHaveBeenCalledTimes(2);
    });

    it("should allow new call after previous one resolves", async () => {
      const { sut, superGetSlot } = setUp();

      await sut.getSlot();
      await sut.getSlot();

      expect(superGetSlot).toHaveBeenCalledTimes(2);
    });

    it("should clear cache after rejection and allow retry", async () => {
      const { sut, superGetSlot } = setUp();

      superGetSlot.mockRejectedValueOnce(new Error("RPC fail"));

      await expect(sut.getSlot()).rejects.toThrow("RPC fail");

      superGetSlot.mockResolvedValueOnce(MOCK_SLOT);
      const result = await sut.getSlot();

      expect(result).toBe(MOCK_SLOT);
    });
  });

  describe("delegate wiring", () => {
    it("getAccountsInfoRequestCollectorGetMultipleAccountsInfoAndContext calls super.getMultipleAccountsInfoAndContext", async () => {
      const { sut, superGetMultipleAccountsInfoAndContext } = setUp();
      const keys = [makePublicKey(1)];

      const result = await sut.getAccountsInfoRequestCollectorGetMultipleAccountsInfoAndContext(
        keys,
        undefined
      );

      expect(result).toEqual({ context: { slot: MOCK_CONTEXT_SLOT }, value: [makeAccountInfo(1)] });
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledWith(keys, undefined);
    });
  });

  describe("per-commitmentOrConfig collectors", () => {
    it("should batch concurrent calls sharing the same commitment string into one super call", async () => {
      const { sut, superGetMultipleAccountsInfoAndContext } = setUp();

      const [r1, r2] = await Promise.all([
        sut.getMultipleAccountsInfo([makePublicKey(1)], CONFIRMED),
        sut.getMultipleAccountsInfo([makePublicKey(2)], CONFIRMED),
      ]);

      expect(r1).toEqual([makeAccountInfo(1)]);
      expect(r2).toEqual([makeAccountInfo(2)]);
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledTimes(1);
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledWith(
        [makePublicKey(1), makePublicKey(2)],
        CONFIRMED
      );
    });

    it("should NOT batch calls with different commitments", async () => {
      const { sut, superGetMultipleAccountsInfoAndContext } = setUp();

      const [r1, r2] = await Promise.all([
        sut.getMultipleAccountsInfo([makePublicKey(1)], CONFIRMED),
        sut.getMultipleAccountsInfo([makePublicKey(2)], FINALIZED),
      ]);

      expect(r1).toEqual([makeAccountInfo(1)]);
      expect(r2).toEqual([makeAccountInfo(2)]);
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledTimes(2);
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledWith(
        [makePublicKey(1)],
        CONFIRMED
      );
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledWith(
        [makePublicKey(2)],
        FINALIZED
      );
    });

    it("should NOT batch calls with undefined vs set commitmentOrConfig", async () => {
      const { sut, superGetMultipleAccountsInfoAndContext } = setUp();

      const [r1, r2] = await Promise.all([
        sut.getMultipleAccountsInfo([makePublicKey(1)]),
        sut.getMultipleAccountsInfo([makePublicKey(2)], CONFIRMED),
      ]);

      expect(r1).toEqual([makeAccountInfo(1)]);
      expect(r2).toEqual([makeAccountInfo(2)]);
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledTimes(2);
    });

    it("should batch getAccountInfo with getMultipleAccountsInfo when commitments match", async () => {
      const { sut, superGetMultipleAccountsInfoAndContext } = setUp();

      const [single, multi] = await Promise.all([
        sut.getAccountInfo(makePublicKey(1), CONFIRMED),
        sut.getMultipleAccountsInfo([makePublicKey(2)], CONFIRMED),
      ]);

      expect(single).toEqual(makeAccountInfo(1));
      expect(multi).toEqual([makeAccountInfo(2)]);
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledTimes(1);
    });

    it("should recreate collector for the same key after a flush", async () => {
      const { sut, superGetMultipleAccountsInfoAndContext } = setUp();

      await sut.getMultipleAccountsInfo([makePublicKey(1)], CONFIRMED);
      // Second call must successfully spin up a fresh collector under the same key
      const result = await sut.getMultipleAccountsInfo([makePublicKey(2)], CONFIRMED);

      expect(result).toEqual([makeAccountInfo(2)]);
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledTimes(2);
    });

    it("should treat equivalent config objects as the same collector key", async () => {
      const { sut, superGetMultipleAccountsInfoAndContext } = setUp();

      const [r1, r2] = await Promise.all([
        sut.getMultipleAccountsInfo([makePublicKey(1)], { commitment: CONFIRMED }),
        sut.getMultipleAccountsInfo([makePublicKey(2)], { commitment: CONFIRMED }),
      ]);

      expect(r1).toEqual([makeAccountInfo(1)]);
      expect(r2).toEqual([makeAccountInfo(2)]);
      expect(superGetMultipleAccountsInfoAndContext).toHaveBeenCalledTimes(1);
    });
  });
});
