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
    connection,
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
      const { connection, superGetMultipleAccountsInfo } = setUp();
      const keys = [makePublicKey(1), makePublicKey(2)];

      const result = await connection.getMultipleAccountsInfo(keys);

      expect(result).toEqual([makeAccountInfo(1), makeAccountInfo(2)]);
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledTimes(1);
    });

    it("should bypass collector when commitmentOrConfig is set", async () => {
      const { connection, superGetMultipleAccountsInfo } = setUp();
      const keys = [makePublicKey(1)];

      const result = await connection.getMultipleAccountsInfo(keys, "confirmed");

      expect(result).toEqual([makeAccountInfo(1)]);
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledWith(keys, "confirmed");
    });

    it("should batch concurrent calls through collector", async () => {
      const { connection, superGetMultipleAccountsInfo } = setUp();

      const [r1, r2] = await Promise.all([
        connection.getMultipleAccountsInfo([makePublicKey(1)]),
        connection.getMultipleAccountsInfo([makePublicKey(2)]),
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
      const { connection, superGetMultipleAccountsInfo } = setUp();

      const result = await connection.getAccountInfo(makePublicKey(5));

      expect(result).toEqual(makeAccountInfo(5));
      // Goes through collector → super.getMultipleAccountsInfo, not super.getAccountInfo
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledTimes(1);
    });

    it("should return null for missing account", async () => {
      const { connection } = setUp();

      const result = await connection.getAccountInfo(makePublicKey(0));

      expect(result).toBeNull();
    });

    it("should bypass collector when commitmentOrConfig is set", async () => {
      const { connection, superGetAccountInfo, superGetMultipleAccountsInfo } = setUp();

      const result = await connection.getAccountInfo(makePublicKey(3), "finalized");

      expect(result).toEqual(makeAccountInfo(3));
      expect(superGetAccountInfo).toHaveBeenCalledWith(makePublicKey(3), "finalized");
      expect(superGetMultipleAccountsInfo).not.toHaveBeenCalled();
    });

    it("should batch getAccountInfo with getMultipleAccountsInfo through collector", async () => {
      const { connection, superGetMultipleAccountsInfo } = setUp();

      const [single, multi] = await Promise.all([
        connection.getAccountInfo(makePublicKey(1)),
        connection.getMultipleAccountsInfo([makePublicKey(2), makePublicKey(3)]),
      ]);

      expect(single).toEqual(makeAccountInfo(1));
      expect(multi).toEqual([makeAccountInfo(2), makeAccountInfo(3)]);
      // All batched into one call
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledTimes(1);
    });
  });

  describe("getEpochInfo", () => {
    it("should return epoch info", async () => {
      const { connection, superGetEpochInfo } = setUp();

      const result = await connection.getEpochInfo();

      expect(result).toEqual(MOCK_EPOCH_INFO);
      expect(superGetEpochInfo).toHaveBeenCalledTimes(1);
    });

    it("should bypass caching when commitmentOrConfig is set", async () => {
      const { connection, superGetEpochInfo } = setUp();

      await connection.getEpochInfo("finalized");

      expect(superGetEpochInfo).toHaveBeenCalledWith("finalized");
    });

    it("should deduplicate concurrent getEpochInfo calls", async () => {
      const { connection, superGetEpochInfo } = setUp();

      const [r1, r2, r3] = await Promise.all([
        connection.getEpochInfo(),
        connection.getEpochInfo(),
        connection.getEpochInfo(),
      ]);

      expect(r1).toEqual(MOCK_EPOCH_INFO);
      expect(r2).toEqual(MOCK_EPOCH_INFO);
      expect(r3).toEqual(MOCK_EPOCH_INFO);
      expect(superGetEpochInfo).toHaveBeenCalledTimes(1);
    });

    it("should NOT deduplicate when commitmentOrConfig is set", async () => {
      const { connection, superGetEpochInfo } = setUp();

      await Promise.all([
        connection.getEpochInfo("confirmed"),
        connection.getEpochInfo("confirmed"),
      ]);

      expect(superGetEpochInfo).toHaveBeenCalledTimes(2);
    });

    it("should allow new call after previous one resolves", async () => {
      const { connection, superGetEpochInfo } = setUp();

      await connection.getEpochInfo();
      await connection.getEpochInfo();

      expect(superGetEpochInfo).toHaveBeenCalledTimes(2);
    });

    it("should clear cache after rejection and allow retry", async () => {
      const { connection, superGetEpochInfo } = setUp();

      superGetEpochInfo.mockRejectedValueOnce(new Error("RPC fail"));

      await expect(connection.getEpochInfo()).rejects.toThrow("RPC fail");

      superGetEpochInfo.mockResolvedValueOnce(MOCK_EPOCH_INFO);
      const result = await connection.getEpochInfo();

      expect(result).toEqual(MOCK_EPOCH_INFO);
    });
  });

  describe("getSlot", () => {
    it("should return slot", async () => {
      const { connection, superGetSlot } = setUp();

      const result = await connection.getSlot();

      expect(result).toBe(MOCK_SLOT);
      expect(superGetSlot).toHaveBeenCalledTimes(1);
    });

    it("should bypass caching when commitmentOrConfig is set", async () => {
      const { connection, superGetSlot } = setUp();

      await connection.getSlot("finalized");

      expect(superGetSlot).toHaveBeenCalledWith("finalized");
    });

    it("should deduplicate concurrent getSlot calls", async () => {
      const { connection, superGetSlot } = setUp();

      const [r1, r2, r3] = await Promise.all([
        connection.getSlot(),
        connection.getSlot(),
        connection.getSlot(),
      ]);

      expect(r1).toBe(MOCK_SLOT);
      expect(r2).toBe(MOCK_SLOT);
      expect(r3).toBe(MOCK_SLOT);
      expect(superGetSlot).toHaveBeenCalledTimes(1);
    });

    it("should NOT deduplicate when commitmentOrConfig is set", async () => {
      const { connection, superGetSlot } = setUp();

      await Promise.all([connection.getSlot("confirmed"), connection.getSlot("confirmed")]);

      expect(superGetSlot).toHaveBeenCalledTimes(2);
    });

    it("should allow new call after previous one resolves", async () => {
      const { connection, superGetSlot } = setUp();

      await connection.getSlot();
      await connection.getSlot();

      expect(superGetSlot).toHaveBeenCalledTimes(2);
    });

    it("should clear cache after rejection and allow retry", async () => {
      const { connection, superGetSlot } = setUp();

      superGetSlot.mockRejectedValueOnce(new Error("RPC fail"));

      await expect(connection.getSlot()).rejects.toThrow("RPC fail");

      superGetSlot.mockResolvedValueOnce(MOCK_SLOT);
      const result = await connection.getSlot();

      expect(result).toBe(MOCK_SLOT);
    });
  });

  describe("delegate wiring", () => {
    it("getAccountsInfoRequestCollectorGetMultipleAccountsInfo calls super.getMultipleAccountsInfo", async () => {
      const { connection, superGetMultipleAccountsInfo } = setUp();
      const keys = [makePublicKey(1)];

      const result = await connection.getAccountsInfoRequestCollectorGetMultipleAccountsInfo(
        keys,
        undefined
      );

      expect(result).toEqual([makeAccountInfo(1)]);
      expect(superGetMultipleAccountsInfo).toHaveBeenCalledWith(keys, undefined);
    });
  });
});
