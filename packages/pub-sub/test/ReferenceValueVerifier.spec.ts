import { DataPackage, NumericDataPoint } from "@redstone-finance/protocol";
import { ethers } from "ethers";
import { ReferenceValueVerifier } from "../src/ReferenceValueVerifier";

// logger mocks
const mockDebug = jest.fn();
const mockWarn = jest.fn();
const mockError = jest.fn();

jest.mock("@redstone-finance/utils", () => {
  const actual =
    jest.requireActual<typeof import("@redstone-finance/utils")>("@redstone-finance/utils");

  const loggerFactory: typeof actual.loggerFactory = (moduleName: string) => {
    const logger = actual.loggerFactory(moduleName);
    jest.spyOn(logger, "debug").mockImplementation((...args: Parameters<typeof logger.debug>) => {
      mockDebug(...args);
    });
    jest.spyOn(logger, "warn").mockImplementation((...args: Parameters<typeof logger.warn>) => {
      mockWarn(...args);
    });
    jest.spyOn(logger, "error").mockImplementation((...args: Parameters<typeof logger.error>) => {
      mockError(...args);
    });
    return logger;
  };

  return {
    ...actual,
    loggerFactory,
  };
});

const MOCK_WALLET_1 = new ethers.Wallet(
  "0xfae81e7c122f2ad245be182d88889e6a037bbeebd7de7bb5ca10f891d359e440"
);
const MOCK_WALLET_2 = new ethers.Wallet(
  "0x0a566b182e650472efe9a17efb850cc01bb5e479add24739942ba43327a194f9"
);
const MOCK_WALLET_3 = new ethers.Wallet(
  "0xd56e1ee933657d6bcdec81f9956392aef47a7f8b1a1275b6e4ad551fb5d6b14c"
);

function makeSigned(signer: ethers.Wallet, dataPackageId: string, tsMs: number, value: number) {
  const dp = new NumericDataPoint({ dataFeedId: dataPackageId, value });
  const dataPackage = new DataPackage([dp], tsMs, dataPackageId);

  return dataPackage.sign(signer.privateKey);
}

// Tests
describe("ReferenceValueVerifier", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns package immediately when signer is a reference signer", () => {
    const verifier = new ReferenceValueVerifier(new Set([MOCK_WALLET_1.address]));
    const s = makeSigned(MOCK_WALLET_1, "BTC", 1730000000000, 100);
    const result = verifier.verifyDataPackage(s);
    expect(result).toBe(s);
    expect(mockWarn).not.toHaveBeenCalled();
    expect(mockError).not.toHaveBeenCalled();
  });

  it("passes when not enough reference values (minReferenceValues > found)", () => {
    const verifier = new ReferenceValueVerifier(
      new Set([MOCK_WALLET_1.address, MOCK_WALLET_2.address]),
      1,
      3,
      2
    );

    const ts = 1730000001000;
    verifier.registerDataPackage(makeSigned(MOCK_WALLET_1, "ETH", ts, 200));

    const tested = makeSigned(MOCK_WALLET_3, "ETH", ts, 205);
    const result = verifier.verifyDataPackage(tested);

    expect(result).toBe(tested);
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining("Not enough reference values"),
      expect.any(Object)
    );
    expect(mockError).not.toHaveBeenCalled();
  });

  it("rejects when enough reference values and deviation >= threshold", () => {
    const verifier = new ReferenceValueVerifier(
      new Set([MOCK_WALLET_1.address, MOCK_WALLET_2.address, MOCK_WALLET_3.address]),
      1,
      3,
      2
    );

    const ts = 1730000002000;
    verifier.registerDataPackage(makeSigned(MOCK_WALLET_1, "BTC", ts, 100));
    verifier.registerDataPackage(makeSigned(MOCK_WALLET_2, "BTC", ts, 101));
    verifier.registerDataPackage(makeSigned(MOCK_WALLET_3, "BTC", ts, 102));

    const tested = makeSigned(ethers.Wallet.createRandom(), "BTC", ts, 103); // ~1.98% from median 101
    const result = verifier.verifyDataPackage(tested);

    expect(result).toBeUndefined();
    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining("Deviation exceeded for BTC/"),
      expect.objectContaining({ deviationPercent: expect.any(Number) as unknown })
    );
  });

  it("passes when deviation < threshold, with enough references", () => {
    const verifier = new ReferenceValueVerifier(
      new Set([MOCK_WALLET_1.address, MOCK_WALLET_2.address]),
      2,
      3,
      2
    );

    const ts = 1730000003000;
    verifier.registerDataPackage(makeSigned(MOCK_WALLET_1, "BTC", ts, 100));
    verifier.registerDataPackage(makeSigned(MOCK_WALLET_2, "BTC", ts, 102));

    const tested = makeSigned(ethers.Wallet.createRandom(), "BTC", ts, 101.5); // ~0.5% from median 101
    const result = verifier.verifyDataPackage(tested);

    expect(result).toBe(tested);
    expect(mockError).not.toHaveBeenCalled();
  });

  it("uses values only from reference signers and only for matching dataPackageId", () => {
    const verifier = new ReferenceValueVerifier(
      new Set([MOCK_WALLET_1.address, MOCK_WALLET_2.address, MOCK_WALLET_3.address]),
      0.5,
      3,
      2
    );

    const ts = 1730000004000;
    verifier.registerDataPackage(makeSigned(MOCK_WALLET_1, "SOL", ts, 50));
    verifier.registerDataPackage(makeSigned(MOCK_WALLET_2, "SOL", ts, 52));
    // non-reference signer (ignored as reference)
    verifier.registerDataPackage(makeSigned(ethers.Wallet.createRandom(), "SOL", ts, 10));
    // different id (ignored)
    verifier.registerDataPackage(makeSigned(MOCK_WALLET_3, "BTC", ts, 9999));

    const tested = makeSigned(ethers.Wallet.createRandom(), "SOL", ts, 51.2); // median 51, ~0.392%
    const result = verifier.verifyDataPackage(tested);
    expect(result).toBe(tested);
    expect(mockError).not.toHaveBeenCalled();
  });

  it("respects maxDelayInSeconds by using entries from previous seconds", () => {
    const verifier = new ReferenceValueVerifier(
      new Set([MOCK_WALLET_1.address, MOCK_WALLET_2.address]),
      1,
      3,
      2
    );

    const tNow = 1730000005000;
    verifier.registerDataPackage(makeSigned(MOCK_WALLET_1, "ADA", tNow - 2000, 10));
    verifier.registerDataPackage(makeSigned(MOCK_WALLET_2, "ADA", tNow - 2000, 11));

    const tested = makeSigned(ethers.Wallet.createRandom(), "ADA", tNow, 10.4); // median=10.5, ~0.95%
    const result = verifier.verifyDataPackage(tested);
    expect(result).toBe(tested);
  });

  it("normalizes timestamps to 1s granulation when registering and verifying", () => {
    const verifier = new ReferenceValueVerifier(
      new Set([MOCK_WALLET_1.address, MOCK_WALLET_2.address]),
      1,
      0,
      2
    );

    // First ref around 3000ms -> normalizes to 3000ms
    verifier.registerDataPackage(makeSigned(MOCK_WALLET_1, "DOT", 1000_000_3001, 20));
    // Second ref at different second (4001ms -> 4000ms)
    verifier.registerDataPackage(makeSigned(MOCK_WALLET_2, "DOT", 1000_000_4001, 22));

    // Test in ~3000ms -> only first ref -> not enough
    const tested1 = makeSigned(ethers.Wallet.createRandom(), "DOT", 1000_000_3000, 21);
    const r1 = verifier.verifyDataPackage(tested1);
    expect(r1).toBe(tested1);
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining("Not enough reference values"),
      expect.any(Object)
    );

    // We add a second ref in the same second (3005ms -> 3000ms)
    verifier.registerDataPackage(makeSigned(MOCK_WALLET_2, "DOT", 1000_000_3005, 22));
    const tested2 = makeSigned(ethers.Wallet.createRandom(), "DOT", 1000_000_3002, 21);
    const r2 = verifier.verifyDataPackage(tested2);
    expect(r2).toBe(tested2); // median(20,22)=21 -> deviation 0
  });
});
