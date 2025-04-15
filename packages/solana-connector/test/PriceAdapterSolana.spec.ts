import {
  DEFAULT_SOLANA_CONFIG,
  PriceAdapterContract,
  SolanaPricesContractAdapter,
  SolanaTxDeliveryMan,
} from "../src";
import { setUpEnv } from "./setup-env";
import { testSample } from "./test-data";

function getSolanaPricesContractAdapter(trusted: "trusted" | "untrusted") {
  const { svm, trustedSigner, untrustedSigner, programId, connection, state } =
    setUpEnv();
  const signer = trusted === "trusted" ? trustedSigner : untrustedSigner;

  const contractAdapter = new PriceAdapterContract(
    connection,
    programId.toBase58(),
    signer.publicKey
  );

  const priceAdapter = new SolanaPricesContractAdapter(
    contractAdapter,
    new SolanaTxDeliveryMan(connection, signer, DEFAULT_SOLANA_CONFIG)
  );

  return {
    svm,
    connection,
    priceAdapter,
    state,
  };
}

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

  it("writePricesFromPayloadToContract can update feed price after 4 tx confirmation errors", async () => {
    const { priceAdapter, state } = getSolanaPricesContractAdapter("trusted");
    const { timestamp, provider, price } = testSample("default");

    state
      .setClock(timestamp)
      .thenDontSubmitAndErrorFor(4)
      .thenSubmit()
      .thenTransactionStatus("confirmed");

    await priceAdapter.writePricesFromPayloadToContract(provider);

    const data = (await priceAdapter.readContractData(["ETH"]))["ETH"];

    expect(data.lastValue).toBe(price);
    expect(data.lastDataPackageTimestampMS).toBe(timestamp);
  });

  it("writePricesFromPayloadToContract can't update feed price after 5 failed submission attempts", async () => {
    const { priceAdapter, state } = getSolanaPricesContractAdapter("trusted");
    const { timestamp, provider } = testSample("default");

    state.setClock(timestamp).thenDontSubmitAndErrorFor(5);

    await expect(
      async () => await priceAdapter.writePricesFromPayloadToContract(provider)
    ).rejects.toThrow();
  });

  it("writePricesFromPayloadToContract should bump fee upon errors", async () => {
    const { priceAdapter, state } = getSolanaPricesContractAdapter("trusted");
    const { timestamp, provider } = testSample("default");

    state.setClock(timestamp).thenDontSubmitAndErrorFor(5);

    await expect(
      async () => await priceAdapter.writePricesFromPayloadToContract(provider)
    ).rejects.toThrow();

    const fees = state.fees;

    expect(fees).toStrictEqual([0, 6, 31, 167, 916]);
  });

  it("writePricesFromPayloadToContract should bump fee upon network congestion errors", async () => {
    const { priceAdapter, state } = getSolanaPricesContractAdapter("trusted");
    const { timestamp, provider } = testSample("default");

    state
      .setClock(timestamp)
      .thenDontSubmitAndErrorFor(5)
      .thenSetRecentFee([1000])
      .thenSetRecentFee([1100])
      .thenSetRecentFee([1200])
      .thenSetRecentFee([1000]);

    await expect(
      async () => await priceAdapter.writePricesFromPayloadToContract(provider)
    ).rejects.toThrow();

    const fees = state.fees;

    expect(fees).toStrictEqual([0, 1000, 1100, 1200, 1000]);
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
