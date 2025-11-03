import { execSync } from "child_process";
import {
  AnchorReadonlyProvider,
  DEFAULT_SOLANA_CONFIG,
  PriceAdapterContract,
  SolanaClient,
  SolanaPricesContractAdapter,
  SolanaTxDeliveryMan,
} from "../src";
import { ConnectionStateScenario, LiteSVMConnection } from "./LiteSVMConnection";
import { setUpEnv } from "./setup-env";
import { testSample } from "./test-data";

function getSolanaPricesContractAdapter(trusted: "trusted" | "untrusted") {
  const { svm, trustedSigner, untrustedSigner, programId } = setUpEnv();
  const signer = trusted === "trusted" ? trustedSigner : untrustedSigner;

  const state = new ConnectionStateScenario(svm);
  const connection = new LiteSVMConnection(state);

  const client = new SolanaClient(connection);
  const contractAdapter = new PriceAdapterContract(
    programId.toBase58(),
    new AnchorReadonlyProvider(connection, client, signer.publicKey),
    client
  );

  const priceAdapter = new SolanaPricesContractAdapter(
    contractAdapter,
    new SolanaTxDeliveryMan(
      client,
      {
        ...DEFAULT_SOLANA_CONFIG,
        useAggressiveGasOracle: false,
      },
      signer
    )
  );

  return {
    svm,
    connection,
    priceAdapter,
    state,
  };
}

describe("SolanaPricesContractAdapter tests", () => {
  beforeAll(() => {
    execSync("make build -C solana", { stdio: "inherit" });
  });

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

    expect(data.lastValue).toBeCloseTo(price, 0);
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

  it("writePricesFromPayloadToContract can update feed price after 7 tx confirmation errors", async () => {
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

  it("writePricesFromPayloadToContract can't update feed price after 8 failed submission attempts", async () => {
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

    expect(fees).toStrictEqual([1, 2, 4, 8, 16, 32, 64, 128]);
  });

  it("writePricesFromPayloadToContract should bump fee upon network congestion errors", async () => {
    const { priceAdapter, state } = getSolanaPricesContractAdapter("trusted");
    const { timestamp, provider } = testSample("default");

    state
      .setClock(timestamp)
      .thenDontSubmitAndErrorFor(DEFAULT_SOLANA_CONFIG.maxTxAttempts)
      .thenSetRecentFee([1000])
      .thenSetRecentFee([1100])
      .thenSetRecentFee([1200])
      .thenSetRecentFee([1000]);

    await expect(
      async () => await priceAdapter.writePricesFromPayloadToContract(provider)
    ).rejects.toThrow();

    const fees = state.fees;

    expect(fees).toStrictEqual([1000, 2200, 4800, 8000, 16, 32, 64, 128]);
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
});
