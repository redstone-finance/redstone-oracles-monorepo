import {
  Commitment,
  Connection,
  EpochInfo,
  GetAccountInfoConfig,
  PublicKey,
} from "@solana/web3.js";
import { RedStoneConnection } from "../src/RedStoneConnection";
import { makeAccountInfo, makePublicKey } from "./test-helpers";

const MOCK_SLOT = 123456;

const MOCK_EPOCH_INFO: EpochInfo = {
  epoch: 42,
  slotIndex: 100,
  slotsInEpoch: 432000,
  absoluteSlot: 123456,
  blockHeight: 99999,
};

function setUp() {
  const connection = new RedStoneConnection("http://localhost:8899");

  const superGetMultipleAccountsInfo = jest
    .spyOn(Connection.prototype, "getMultipleAccountsInfo")
    .mockImplementation(
      (publicKeys: PublicKey[], _commitmentOrConfig?: Commitment | GetAccountInfoConfig) =>
        Promise.resolve(
          publicKeys.map((pk) => {
            const byte = pk.toBuffer().readUInt32BE(0);

            return byte > 0 ? makeAccountInfo(byte) : null;
          })
        )
    );

  const superGetAccountInfo = jest
    .spyOn(Connection.prototype, "getAccountInfo")
    .mockImplementation(
      (publicKey: PublicKey, _commitmentOrConfig?: Commitment | GetAccountInfoConfig) => {
        const byte = publicKey.toBuffer().readUInt32BE(0);

        return Promise.resolve(byte > 0 ? makeAccountInfo(byte) : null);
      }
    );

  const superGetEpochInfo = jest
    .spyOn(Connection.prototype, "getEpochInfo")
    .mockResolvedValue(MOCK_EPOCH_INFO);

  const superGetSlot = jest.spyOn(Connection.prototype, "getSlot").mockResolvedValue(MOCK_SLOT);

  return {
    sut: connection,
    superGetMultipleAccountsInfo,
    superGetAccountInfo,
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
      const { sut, superGetMultipleAccountsInfo } = setUp();
      const keys = [makePublicKey(1), makePublicKey(2)];

      const result = await sut.getMultipleAccountsInfo(keys);

      expect(result).toEqual([makeAccountInfo(1), makeAccountInfo(2)]);
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledTimes(1);
    });

    it("should run collector even when commitmentOrConfig is set", async () => {
      const { sut, superGetMultipleAccountsInfo } = setUp();
      const keys = [makePublicKey(1)];

      const result = await sut.getMultipleAccountsInfo(keys, "confirmed");

      expect(result).toEqual([makeAccountInfo(1)]);
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledWith(keys, "confirmed");
    });

    it("should batch concurrent calls through collector", async () => {
      const { sut, superGetMultipleAccountsInfo } = setUp();

      const [r1, r2] = await Promise.all([
        sut.getMultipleAccountsInfo([makePublicKey(1)]),
        sut.getMultipleAccountsInfo([makePublicKey(2)]),
      ]);

      expect(r1).toEqual([makeAccountInfo(1)]);
      expect(r2).toEqual([makeAccountInfo(2)]);
      // Both batched into single super call
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledTimes(1);
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledWith(
        [makePublicKey(1), makePublicKey(2)],
        undefined
      );
    });
  });

  describe("getAccountInfo", () => {
    it("should delegate single key through collector", async () => {
      const { sut, superGetMultipleAccountsInfo } = setUp();

      const result = await sut.getAccountInfo(makePublicKey(5));

      expect(result).toEqual(makeAccountInfo(5));
      // Goes through collector → super.getMultipleAccountsInfo, not super.getAccountInfo
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledTimes(1);
    });

    it("should return null for missing account", async () => {
      const { sut } = setUp();

      const result = await sut.getAccountInfo(makePublicKey(0));

      expect(result).toBeNull();
    });

    it("should route through collector and forward commitmentOrConfig to super.getMultipleAccountsInfo", async () => {
      const { sut, superGetAccountInfo, superGetMultipleAccountsInfo } = setUp();

      const result = await sut.getAccountInfo(makePublicKey(3), "finalized");

      expect(result).toEqual(makeAccountInfo(3));
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledWith([makePublicKey(3)], "finalized");
      expect(superGetAccountInfo).not.toHaveBeenCalled();
    });

    it("should batch getAccountInfo with getMultipleAccountsInfo through collector", async () => {
      const { sut, superGetMultipleAccountsInfo } = setUp();

      const [single, multi] = await Promise.all([
        sut.getAccountInfo(makePublicKey(1)),
        sut.getMultipleAccountsInfo([makePublicKey(2), makePublicKey(3)]),
      ]);

      expect(single).toEqual(makeAccountInfo(1));
      expect(multi).toEqual([makeAccountInfo(2), makeAccountInfo(3)]);
      // All batched into one call
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledTimes(1);
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

      await sut.getEpochInfo("finalized");

      expect(superGetEpochInfo).toHaveBeenCalledWith("finalized");
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

      await Promise.all([sut.getEpochInfo("confirmed"), sut.getEpochInfo("confirmed")]);

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

      await sut.getSlot("finalized");

      expect(superGetSlot).toHaveBeenCalledWith("finalized");
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

      await Promise.all([sut.getSlot("confirmed"), sut.getSlot("confirmed")]);

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
    it("getAccountsInfoRequestCollectorGetMultipleAccountsInfo calls super.getMultipleAccountsInfo", async () => {
      const { sut, superGetMultipleAccountsInfo } = setUp();
      const keys = [makePublicKey(1)];

      const result = await sut.getAccountsInfoRequestCollectorGetMultipleAccountsInfo(
        keys,
        undefined
      );

      expect(result).toEqual([makeAccountInfo(1)]);
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledWith(keys, undefined);
    });
  });

  describe("per-commitmentOrConfig collectors", () => {
    it("should batch concurrent calls sharing the same commitment string into one super call", async () => {
      const { sut, superGetMultipleAccountsInfo } = setUp();

      const [r1, r2] = await Promise.all([
        sut.getMultipleAccountsInfo([makePublicKey(1)], "confirmed"),
        sut.getMultipleAccountsInfo([makePublicKey(2)], "confirmed"),
      ]);

      expect(r1).toEqual([makeAccountInfo(1)]);
      expect(r2).toEqual([makeAccountInfo(2)]);
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledTimes(1);
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledWith(
        [makePublicKey(1), makePublicKey(2)],
        "confirmed"
      );
    });

    it("should NOT batch calls with different commitments", async () => {
      const { sut, superGetMultipleAccountsInfo } = setUp();

      const [r1, r2] = await Promise.all([
        sut.getMultipleAccountsInfo([makePublicKey(1)], "confirmed"),
        sut.getMultipleAccountsInfo([makePublicKey(2)], "finalized"),
      ]);

      expect(r1).toEqual([makeAccountInfo(1)]);
      expect(r2).toEqual([makeAccountInfo(2)]);
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledTimes(2);
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledWith([makePublicKey(1)], "confirmed");
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledWith([makePublicKey(2)], "finalized");
    });

    it("should NOT batch calls with undefined vs set commitmentOrConfig", async () => {
      const { sut, superGetMultipleAccountsInfo } = setUp();

      const [r1, r2] = await Promise.all([
        sut.getMultipleAccountsInfo([makePublicKey(1)]),
        sut.getMultipleAccountsInfo([makePublicKey(2)], "confirmed"),
      ]);

      expect(r1).toEqual([makeAccountInfo(1)]);
      expect(r2).toEqual([makeAccountInfo(2)]);
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledTimes(2);
    });

    it("should batch getAccountInfo with getMultipleAccountsInfo when commitments match", async () => {
      const { sut, superGetMultipleAccountsInfo } = setUp();

      const [single, multi] = await Promise.all([
        sut.getAccountInfo(makePublicKey(1), "confirmed"),
        sut.getMultipleAccountsInfo([makePublicKey(2)], "confirmed"),
      ]);

      expect(single).toEqual(makeAccountInfo(1));
      expect(multi).toEqual([makeAccountInfo(2)]);
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledTimes(1);
    });

    it("should recreate collector for the same key after a flush", async () => {
      const { sut, superGetMultipleAccountsInfo } = setUp();

      // First call flushes and disposes the "confirmed" collector
      await sut.getMultipleAccountsInfo([makePublicKey(1)], "confirmed");
      // Second call must successfully spin up a fresh collector under the same key
      const result = await sut.getMultipleAccountsInfo([makePublicKey(2)], "confirmed");

      expect(result).toEqual([makeAccountInfo(2)]);
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledTimes(2);
    });

    it("should treat equivalent config objects as the same collector key", async () => {
      const { sut, superGetMultipleAccountsInfo } = setUp();

      const [r1, r2] = await Promise.all([
        sut.getMultipleAccountsInfo([makePublicKey(1)], { commitment: "confirmed" }),
        sut.getMultipleAccountsInfo([makePublicKey(2)], { commitment: "confirmed" }),
      ]);

      expect(r1).toEqual([makeAccountInfo(1)]);
      expect(r2).toEqual([makeAccountInfo(2)]);
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledTimes(1);
    });
  });
});
