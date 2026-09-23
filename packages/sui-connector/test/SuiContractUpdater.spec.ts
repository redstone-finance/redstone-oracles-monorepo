import type { SuiClientTypes } from "@mysten/sui/client";
import { Secp256k1Keypair } from "@mysten/sui/keypairs/secp256k1";
import { ParallelTransactionExecutor } from "@mysten/sui/transactions";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { makeSuiClient, makeSuiConfig } from "../src";
import { SuiContractUpdater } from "../src/adapter/SuiContractUpdater";
import { GrpcSuiClient } from "../src/client/GrpcSuiClient";
import {
  ADAPTER_OBJECT_ID,
  DIGEST,
  FEED_ID,
  FEED_IDS,
  GAS_SUMMARY,
  makeParamsProvider,
  makePriceWriteEvent,
  makeUpdateErrorEvent,
  NETWORK,
  OTHER_FEED_ID,
  PACKAGE_ID,
  PAYLOAD_HEX,
  REFERENCE_GAS_PRICE,
} from "./fixtures";

const UPDATE_START_TIME_MS = 1790080056000;
const FIRST_ATTEMPT = 0;
const GAS_ERROR = "Out of gas";

describe("SuiContractUpdater", () => {
  let paramsProvider: ContractParamsProvider;
  let executeTransaction: jest.SpyInstance;
  let sut: SuiContractUpdater;

  beforeEach(() => {
    paramsProvider = makeParamsProvider(FEED_IDS);
    jest
      .spyOn(paramsProvider, "prepareSplitPayloads")
      .mockResolvedValue({ [FEED_ID]: PAYLOAD_HEX, [OTHER_FEED_ID]: PAYLOAD_HEX });

    const client = new GrpcSuiClient(makeSuiClient(NETWORK));
    jest.spyOn(client, "getReferenceGasPrice").mockResolvedValue(REFERENCE_GAS_PRICE);

    const keypair = Secp256k1Keypair.generate();
    const executor = new ParallelTransactionExecutor({
      client: client.clientWithCoreApi,
      signer: keypair,
    });
    executeTransaction = jest.spyOn(executor, "executeTransaction");

    sut = new SuiContractUpdater(
      client,
      keypair,
      makeSuiConfig({ packageId: PACKAGE_ID, priceAdapterObjectId: ADAPTER_OBJECT_ID }),
      executor
    );
  });

  it("should return the digest when every feed was written", async () => {
    stubExecution([makePriceWriteEvent(FEED_ID), makePriceWriteEvent(OTHER_FEED_ID)]);

    const result = await sut.update(paramsProvider, makeContext(), FIRST_ATTEMPT);

    expect(result).toEqual({ success: true, ok: { transactionHash: DIGEST } });
  });

  it("should return the digest when only some feeds failed", async () => {
    stubExecution([makePriceWriteEvent(FEED_ID), makeUpdateErrorEvent(OTHER_FEED_ID)]);

    const result = await sut.update(paramsProvider, makeContext(), FIRST_ATTEMPT);

    expect(result).toEqual({ success: true, ok: { transactionHash: DIGEST } });
  });

  it("should not retry a landed transaction in which every feed ended with an update error", async () => {
    stubExecution([makeUpdateErrorEvent(FEED_ID), makeUpdateErrorEvent(OTHER_FEED_ID)]);

    const result = await sut.update(paramsProvider, makeContext(), FIRST_ATTEMPT);

    expect(result).toEqual({ success: true, ok: { transactionHash: DIGEST } });
  });

  it("should fail when the transaction itself failed", async () => {
    stubExecution([makePriceWriteEvent(FEED_ID)], GAS_ERROR);

    const result = await sut.update(paramsProvider, makeContext(), FIRST_ATTEMPT);

    expect(result).toEqual({
      success: false,
      err: expect.stringContaining(GAS_ERROR) as string,
    });
  });

  function stubExecution(events: SuiClientTypes.Event[], failure?: string) {
    executeTransaction.mockResolvedValue({
      $kind: "Transaction",
      Transaction: {
        digest: DIGEST,
        effects: {
          status: failure
            ? { success: false, error: { message: failure, $kind: "Unknown", Unknown: null } }
            : { success: true, error: null },
          gasUsed: GAS_SUMMARY,
        },
        events,
      },
    });
  }

  function makeContext() {
    return { updateStartTimeMs: UPDATE_START_TIME_MS };
  }
});
