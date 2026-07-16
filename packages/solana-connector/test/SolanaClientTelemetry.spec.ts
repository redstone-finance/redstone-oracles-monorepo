import { RpcTelemetry } from "@redstone-finance/utils";
import { Connection } from "@solana/web3.js";
import { SolanaClientBuilder } from "../src";

const MOCK_SLOT = 314159265;
const RPC_URLS = ["https://rpc-a.example.com", "https://rpc-b.example.com"];
const CLUSTER = "mainnet-beta";
const EXPECTED_NETWORK_ID = "solana/1";
const RPC_ERROR_MESSAGE = "rpc failed";
const PRIORITIZATION_FEES = [
  { slot: 1, prioritizationFee: 100 },
  { slot: 2, prioritizationFee: 350 },
  { slot: 3, prioritizationFee: 200 },
];
const MAX_PRIORITIZATION_FEE = 350;

describe("Solana RPC telemetry (Client on Connection)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("reports a blockNumber metric with the slot value for every RPC on getSlot", async () => {
    jest.spyOn(Connection.prototype, "getSlot").mockResolvedValue(MOCK_SLOT);
    const report = jest.fn<void, Parameters<RpcTelemetry.RpcMetricReporter>>();
    const { sut } = setUp(report);

    const slot = await sut.getSlot();

    expect(slot).toBe(MOCK_SLOT);
    for (const url of RPC_URLS) {
      expect(report).toHaveBeenCalledWith(
        expect.objectContaining({
          op: RpcTelemetry.RPC_OP.BLOCK_NUMBER,
          method: "getSlot",
          value: MOCK_SLOT,
          networkId: EXPECTED_NETWORK_ID,
          url,
          isFailure: false,
        })
      );
    }
  });

  it("reports a feeHistory metric with the max prioritization fee on getRecentPrioritizationFees", async () => {
    jest
      .spyOn(Connection.prototype, "getRecentPrioritizationFees")
      .mockResolvedValue(PRIORITIZATION_FEES);
    const report = jest.fn<void, Parameters<RpcTelemetry.RpcMetricReporter>>();
    const { sut } = setUp(report);

    await sut.getRecentPrioritizationFees();

    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({
        op: RpcTelemetry.RPC_OP.FEE_HISTORY,
        method: "getRecentPrioritizationFees",
        value: MAX_PRIORITIZATION_FEE,
        networkId: EXPECTED_NETWORK_ID,
        isFailure: false,
      })
    );
  });

  it("reports a failure metric for every RPC when getSlot throws", async () => {
    jest.spyOn(Connection.prototype, "getSlot").mockRejectedValue(new Error(RPC_ERROR_MESSAGE));
    const report = jest.fn<void, Parameters<RpcTelemetry.RpcMetricReporter>>();
    const { sut } = setUp(report);

    await expect(sut.getSlot()).rejects.toThrow();

    for (const url of RPC_URLS) {
      expect(report).toHaveBeenCalledWith(
        expect.objectContaining({
          op: RpcTelemetry.RPC_OP.BLOCK_NUMBER,
          isFailure: true,
          networkId: EXPECTED_NETWORK_ID,
          url,
        })
      );
    }
  });

  it("works with the logging reporter", async () => {
    jest.spyOn(Connection.prototype, "getSlot").mockResolvedValue(MOCK_SLOT);
    const { sut } = setUp(RpcTelemetry.logRpcMetric);

    await expect(sut.getSlot()).resolves.toBe(MOCK_SLOT);
  });
});

function setUp(report: RpcTelemetry.RpcMetricReporter) {
  const sut = new SolanaClientBuilder()
    .withCluster(CLUSTER)
    .withRpcUrls(RPC_URLS)
    .withTelemetry(report)
    .build();

  return { sut };
}
