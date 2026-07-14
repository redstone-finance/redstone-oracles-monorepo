import { MultiExecutor } from "@redstone-finance/utils";
import { execSync } from "child_process";
import {
  DEFAULT_SOLANA_CONFIG,
  makeSolanaUpdater,
  SolanaClient,
  SolanaWriteContractAdapter,
} from "../src";
import { ConnectionStateScenario, LiteSVMConnection } from "./LiteSVMConnection";
import { setUpEnv } from "./setup-env";
import { testSample } from "./test-data";

const MULTI_CONNECTION_METHOD_CONFIG = {
  getMultipleAccountsInfo: MultiExecutor.ExecutionMode.MULTI_AGREEMENT,
  sendTransaction: MultiExecutor.ExecutionMode.RACE,
};

const MULTI_CONNECTION_EXECUTOR_CONFIG = {
  ...MultiExecutor.DEFAULT_CONFIG,
  multiAgreementShouldResolveUnagreedToUndefined: true,
};

function getSolanaPricesContractAdapter(trusted: "trusted" | "untrusted") {
  const { svm, trustedSigner, untrustedSigner, programId } = setUpEnv();
  const signer = trusted === "trusted" ? trustedSigner : untrustedSigner;

  const state = new ConnectionStateScenario(svm);
  const connection = new LiteSVMConnection(state);

  const client = new SolanaClient(connection);
  const updater = makeSolanaUpdater({ client }, programId.toBase58(), signer);
  const writePriceAdapter = new SolanaWriteContractAdapter(client, updater);

  return {
    svm,
    connection,
    priceAdapter: writePriceAdapter,
    state,
  };
}

beforeAll(() => {
  execSync("make build -C solana", { stdio: "inherit" });
});

describe("SolanaPricesContractAdapter tests", () => {
  it("getUniqueSignerThreshold", async () => {
    const { priceAdapter } = getSolanaPricesContractAdapter("trusted");

    const threshold = await priceAdapter.getUniqueSignerThreshold();

    expect(threshold).toBe(3);
  });

  it("writePricesFromPayloadToContract update feed price", async () => {
    const { priceAdapter, state } = getSolanaPricesContractAdapter("trusted");
    const { price, timestamp, provider } = testSample("default");

    state.setClock(timestamp).thenSubmit().thenTransactionStatus("confirmed");

    await priceAdapter.writePricesFromPayloadToContract(provider);

    const data = (await priceAdapter.readContractData(["ETH"]))["ETH"];

    expect(Number(data.lastValue)).toBeCloseTo(Number(price), 0);
    expect(data.lastDataPackageTimestampMS).toBe(timestamp);
  });

  it("writePricesFromPayloadToContract can't call twice with the same timestamp", async () => {
    const { priceAdapter, state } = getSolanaPricesContractAdapter("trusted");
    const { timestamp, provider } = testSample("default");

    state.setClock(timestamp).thenSubmit().thenTransactionStatus("confirmed");

    await priceAdapter.writePricesFromPayloadToContract(provider);
    await expect(
      async () => await priceAdapter.writePricesFromPayloadToContract(provider)
    ).rejects.toThrow("code: 1101");
  });

  it("writePricesFromPayloadToContract can update feed price when only the last attempt is confirmed", async () => {
    const { priceAdapter, state } = getSolanaPricesContractAdapter("trusted");
    const { timestamp, provider, price } = testSample("default");

    state
      .setClock(timestamp)
      .thenDontSubmitAndErrorFor(DEFAULT_SOLANA_CONFIG.maxTxAttempts - 1)
      .thenSubmit()
      .thenTransactionStatus("confirmed");

    await priceAdapter.writePricesFromPayloadToContract(provider);

    const data = (await priceAdapter.readContractData(["ETH"]))["ETH"];

    expect(data.lastValue).toBe(price);
    expect(data.lastDataPackageTimestampMS).toBe(timestamp);
  });

  it("writePricesFromPayloadToContract can't update feed price when all submission attempts fail", async () => {
    const { priceAdapter, state } = getSolanaPricesContractAdapter("trusted");
    const { timestamp, provider } = testSample("default");

    state.setClock(timestamp).thenDontSubmitAndErrorFor(DEFAULT_SOLANA_CONFIG.maxTxAttempts);

    await expect(
      async () => await priceAdapter.writePricesFromPayloadToContract(provider)
    ).rejects.toThrow();
  });

  it("writePricesFromPayloadToContract should bump fee upon errors", async () => {
    const { priceAdapter, state } = getSolanaPricesContractAdapter("trusted");
    const { timestamp, provider } = testSample("default");

    state.setClock(timestamp).thenDontSubmitAndErrorFor(DEFAULT_SOLANA_CONFIG.maxTxAttempts);

    await expect(
      async () => await priceAdapter.writePricesFromPayloadToContract(provider)
    ).rejects.toThrow();

    const fees = state.fees;

    expect(fees).toStrictEqual([
      100_000, 400_000, 1_600_000, 6_400_000, 31_250_000, 125_000_000, 500_000_000,
    ]);
  });

  it("writePricesFromPayloadToContract should bump fee upon network congestion errors", async () => {
    const { priceAdapter, state } = getSolanaPricesContractAdapter("trusted");
    const { timestamp, provider } = testSample("default");

    state
      .setClock(timestamp)
      .thenDontSubmitAndErrorFor(DEFAULT_SOLANA_CONFIG.maxTxAttempts)
      .thenSetRecentFee([0, 0, 5_000_000])
      .thenSetRecentFee([0, 6_000_000]);

    await expect(
      async () => await priceAdapter.writePricesFromPayloadToContract(provider)
    ).rejects.toThrow();

    const fees = state.fees;

    expect(fees).toStrictEqual([
      100_000, 400_000, 5_000_000, 24_000_000, 31_250_000, 125_000_000, 500_000_000,
    ]);
  });

  it("writePricesFromPayloadToContract cant update if there is less than required signers", async () => {
    const { priceAdapter, state } = getSolanaPricesContractAdapter("trusted");
    const { timestamp, provider } = testSample("2-signatures");

    state.setClock(timestamp).thenTransactionStatus("confirmed");

    await expect(
      async () => await priceAdapter.writePricesFromPayloadToContract(provider)
    ).rejects.toThrow();
  });

  it("writePricesFromPayloadToContract untrusted can write price", async () => {
    const { priceAdapter, state } = getSolanaPricesContractAdapter("untrusted");
    const { timestamp, provider, price } = testSample("default");

    state.setClock(timestamp).thenTransactionStatus("confirmed");

    await priceAdapter.writePricesFromPayloadToContract(provider);

    const data = (await priceAdapter.readContractData(["ETH"]))["ETH"];

    expect(data.lastValue).toBe(price);
    expect(data.lastDataPackageTimestampMS).toBe(timestamp);
  });

  it("writePricesFromPayloadToContract untrusted can't update price too often", async () => {
    const { priceAdapter, state } = getSolanaPricesContractAdapter("untrusted");
    const { timestamp, provider } = testSample("default");
    const { provider: newerProvider } = testSample("newer");

    state.setClock(timestamp).thenTransactionStatus("confirmed");

    await priceAdapter.writePricesFromPayloadToContract(provider);

    state.advanceClock(20);

    await expect(async () => {
      await priceAdapter.writePricesFromPayloadToContract(newerProvider);
    }).rejects.toThrow("code: 1102");
  });

  it("writePricesFromPayloadToContract untrusted can update price after wait period", async () => {
    const { priceAdapter, state } = getSolanaPricesContractAdapter("untrusted");
    const { timestamp, provider } = testSample("default");
    const {
      provider: newerProvider,
      price: newPrice,
      timestamp: newTimestamp,
    } = testSample("newer");

    state.setClock(timestamp).thenTransactionStatus("confirmed");

    await priceAdapter.writePricesFromPayloadToContract(provider);

    state.advanceClock(41);

    await priceAdapter.writePricesFromPayloadToContract(newerProvider);
    const data = (await priceAdapter.readContractData(["ETH"]))["ETH"];

    expect(data.lastValue).toBe(newPrice);
    expect(data.lastDataPackageTimestampMS).toBe(newTimestamp);
  });

  it("writePricesFromPayloadToContract trusted can update price before 40sec threshold", async () => {
    const { priceAdapter, state } = getSolanaPricesContractAdapter("trusted");
    const { timestamp, provider } = testSample("default");
    const {
      provider: newerProvider,
      price: newPrice,
      timestamp: newTimestamp,
    } = testSample("newer");

    state.setClock(timestamp).thenTransactionStatus("confirmed");

    await priceAdapter.writePricesFromPayloadToContract(provider);

    state.advanceClock(20);

    await priceAdapter.writePricesFromPayloadToContract(newerProvider);
    const data = (await priceAdapter.readContractData(["ETH"]))["ETH"];

    expect(data.lastValue).toBe(newPrice);
    expect(data.lastDataPackageTimestampMS).toBe(newTimestamp);
  });

  it("fans reads out across all sub-connections of a multi-connection", async () => {
    const { connections, adapter } = getMultiConnectionAdapter();
    const spies = connections.map((connection) =>
      jest.spyOn(connection, "getMultipleAccountsInfo")
    );

    await adapter.readContractData(["ETH", "BTC"]);

    for (const spy of spies) {
      expect(spy).toHaveBeenCalledTimes(1);
    }
  });

  it("races sendTransaction across all sub-connections of a multi-connection", async () => {
    const { states, connections, adapter } = getMultiConnectionAdapter();
    const { timestamp, provider } = testSample("default");
    states.forEach((state) =>
      state.setClock(timestamp).thenSubmit().thenTransactionStatus("confirmed")
    );
    const spies = connections.map((connection) => jest.spyOn(connection, "sendTransaction"));

    await adapter.writePricesFromPayloadToContract(provider);

    for (const spy of spies) {
      expect(spy).toHaveBeenCalled();
    }
  });
});

function getMultiConnectionAdapter() {
  const { svm, trustedSigner, programId } = setUpEnv();
  const states = [new ConnectionStateScenario(svm), new ConnectionStateScenario(svm)];
  const connections = states.map((state) => new LiteSVMConnection(state));
  const client = MultiExecutor.create(
    connections.map((connection) => new SolanaClient(connection)),
    MULTI_CONNECTION_METHOD_CONFIG,
    MULTI_CONNECTION_EXECUTOR_CONFIG
  );
  const updater = makeSolanaUpdater({ client }, programId.toBase58(), trustedSigner);
  const adapter = new SolanaWriteContractAdapter(client, updater);

  return { states, connections, adapter };
}
