import { ContractData, ContractParamsProvider } from "@redstone-finance/sdk";
import assert from "assert";
import { BigNumber } from "ethers";
import { casperBlake2b } from "../../casper/casper-blake2b";
import { CasperContractAdapter } from "../CasperContractAdapter";
import { RunMode } from "../RunMode";
import { RuntimeArgsFactory } from "../RuntimeArgsFactory";
import {
  ENTRY_POINT_GET_PRICES,
  ENTRY_POINT_WRITE_PRICES,
  STORAGE_KEY_TIMESTAMP,
  STORAGE_KEY_VALUES,
} from "../constants";

export class PriceAdapterCasperContractAdapter extends CasperContractAdapter {
  static SINGLE_PACKAGE_PROCESS_CSPR = 8.5;

  async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider
  ): Promise<string | bigint[]> {
    const payloadHex = await paramsProvider.getPayloadHex(false);
    const feedIds = paramsProvider.getHexlifiedFeedIds();

    return await this.callPricesEntryPoint(
      RunMode.WRITE,
      feedIds,
      paramsProvider.requestParams.uniqueSignersCount * feedIds.length,
      payloadHex,
      casperBlake2b(payloadHex, true)
    );
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- for interface
  getPricesFromPayload(_paramsProvider: ContractParamsProvider): Promise<bigint[]> {
    throw new Error("Method not supported. Use price_relay_adapter contract instead");
  }

  async readTimestampFromContract(): Promise<number> {
    const timestamp: BigNumber = await this.queryContractData(STORAGE_KEY_TIMESTAMP);

    return timestamp.toNumber();
  }

  async readPricesFromContract(paramsProvider: ContractParamsProvider): Promise<bigint[]> {
    const results = await Promise.allSettled(
      paramsProvider.requestParams.dataPackagesIds!.map((feedId) => this.readPriceValue(feedId))
    );

    return results.map((result) => {
      switch (result.status) {
        case "fulfilled":
          return BigNumber.from((result as PromiseFulfilledResult<BigNumber>).value).toBigInt();
        default:
          return 0n;
      }
    });
  }

  protected async callPricesEntryPoint(
    type: RunMode,
    feedIds: string[],
    numberOfPackages: number,
    payloadHex: string,
    _hash: string
  ) {
    assert(
      payloadHex.length / 2 <= RuntimeArgsFactory.CHUNK_SIZE_BYTES,
      `Payload length (currently: ${payloadHex.length / 2}) must not exceed ${
        RuntimeArgsFactory.CHUNK_SIZE_BYTES
      } bytes.
      Use price_relay_adapter contract instead`
    );

    const runtimeArgs = RuntimeArgsFactory.makePayloadRuntimeArgs(feedIds, payloadHex);

    return await this.callEntrypoint(
      type === RunMode.WRITE ? ENTRY_POINT_WRITE_PRICES : ENTRY_POINT_GET_PRICES,
      numberOfPackages * PriceAdapterCasperContractAdapter.SINGLE_PACKAGE_PROCESS_CSPR,
      runtimeArgs
    );
  }

  private readPriceValue(feedId: string) {
    return this.queryContractDictionary(STORAGE_KEY_VALUES, feedId);
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- for interface
  getUniqueSignerThreshold(_blockNumber?: number): Promise<number> {
    throw new Error("Method not supported on Casper");
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- for interface
  readLatestUpdateBlockTimestamp(
    _feedId?: string,
    _blockNumber?: number
  ): Promise<number | undefined> {
    throw new Error("Method not supported on Casper");
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- for interface
  getSignerAddress(): Promise<string | undefined> {
    throw new Error("Method not supported on Casper");
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- for interface
  getDataFeedIds(_blockTag?: number): Promise<string[] | undefined> {
    throw new Error("Method not supported on Casper");
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- for interface
  readContractData(
    _feedIds: string[],
    _blockNumber?: number,
    _withDataFeedValues?: boolean
  ): Promise<ContractData> {
    throw new Error("Method not supported on Casper");
  }
}
