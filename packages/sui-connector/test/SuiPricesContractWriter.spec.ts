import { fromBase64 } from "@mysten/bcs";
import { bcs } from "@mysten/sui/bcs";
import { Secp256k1Keypair } from "@mysten/sui/keypairs/secp256k1";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { SuiPricesContractWriter } from "../src/adapter/SuiPricesContractWriter";
import { GrpcSuiClient } from "../src/client/GrpcSuiClient";
import { makeSuiConfig } from "../src/config";
import { makeFeedIdBytes, makeSuiClient } from "../src/util";
import {
  ADAPTER_MODULE,
  ADAPTER_OBJECT_ID,
  FEED_ID,
  FEED_IDS,
  makeParamsProvider,
  NETWORK,
  OTHER_FEED_ID,
  PACKAGE_ID,
  PAYLOAD_BYTES,
  PAYLOAD_HEX,
  REFERENCE_GAS_PRICE,
  WRITE_PRICE_FUNCTION,
} from "./fixtures";

const METADATA_TIMESTAMP = 1790080056000;

describe("SuiPricesContractWriter", () => {
  let sut: SuiPricesContractWriter;
  let paramsProvider: ContractParamsProvider;

  beforeEach(() => {
    const client = new GrpcSuiClient(makeSuiClient(NETWORK));
    jest.spyOn(client, "getReferenceGasPrice").mockResolvedValue(REFERENCE_GAS_PRICE);

    sut = new SuiPricesContractWriter(
      client,
      Secp256k1Keypair.generate(),
      makeSuiConfig({ packageId: PACKAGE_ID, priceAdapterObjectId: ADAPTER_OBJECT_ID })
    );
    paramsProvider = makeParamsProvider(FEED_IDS);
  });

  it("should throw when no feed has data instead of preparing an empty transaction", async () => {
    stubPayloads({ [FEED_ID]: undefined, [OTHER_FEED_ID]: undefined });

    await expect(
      sut.prepareWritePricesTransaction(paramsProvider, METADATA_TIMESTAMP)
    ).rejects.toThrow(`No data packages for feeds [${FEED_IDS.toString()}]`);
  });

  it("should write only the feeds that have data", async () => {
    stubPayloads({ [FEED_ID]: PAYLOAD_HEX, [OTHER_FEED_ID]: undefined });

    const tx = await sut.prepareWritePricesTransaction(paramsProvider, METADATA_TIMESTAMP);

    expect(tx.getData().commands.map((command) => command.MoveCall)).toMatchObject([
      { package: PACKAGE_ID, module: ADAPTER_MODULE, function: WRITE_PRICE_FUNCTION },
    ]);
  });

  it("should send the feed id and its payload as the write arguments", async () => {
    stubPayloads({ [FEED_ID]: PAYLOAD_HEX, [OTHER_FEED_ID]: undefined });

    const tx = await sut.prepareWritePricesTransaction(paramsProvider, METADATA_TIMESTAMP);

    const pureInputs = tx
      .getData()
      .inputs.filter((input) => input.$kind === "Pure")
      .map((input) => bcs.vector(bcs.u8()).parse(fromBase64(input.Pure.bytes)));

    expect(pureInputs).toEqual([Array.from(makeFeedIdBytes(FEED_ID)), Array.from(PAYLOAD_BYTES)]);
  });

  it("should ask for the payloads with the metadata of this iteration", async () => {
    const prepareSplitPayloads = stubPayloads({
      [FEED_ID]: PAYLOAD_HEX,
      [OTHER_FEED_ID]: PAYLOAD_HEX,
    });

    await sut.prepareWritePricesTransaction(paramsProvider, METADATA_TIMESTAMP);

    expect(prepareSplitPayloads).toHaveBeenCalledWith({
      withUnsignedMetadata: true,
      metadataTimestamp: METADATA_TIMESTAMP,
    });
  });

  function stubPayloads(payloads: Record<string, string | undefined>) {
    return jest.spyOn(paramsProvider, "prepareSplitPayloads").mockResolvedValue(payloads);
  }
});
