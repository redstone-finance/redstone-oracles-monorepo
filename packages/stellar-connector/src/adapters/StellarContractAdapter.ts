import { ContractAdapter } from "@redstone-finance/multichain-kit";
import { ContractData, ContractParamsProvider, LastRoundDetails } from "@redstone-finance/sdk";
import { Contract } from "@stellar/stellar-sdk";
import _ from "lodash";
import { splitParamsIntoBatches } from "../split-params-into-batches";
import { StellarClient } from "../stellar/StellarClient";
import * as XdrUtils from "../XdrUtils";

const GET_PRICES_METHOD = "get_prices";
const UNIQUE_SIGNER_COUNT_METHOD = "unique_signer_threshold";

export class StellarContractAdapter implements ContractAdapter {
  protected readonly contract: Contract;

  constructor(
    protected readonly client: StellarClient,
    contract: string
  ) {
    this.contract = new Contract(contract);
  }

  async readPricesFromContract(paramsProvider: ContractParamsProvider, blockNumber?: number) {
    const feedIds = paramsProvider.getDataFeedIds();

    return (await this.getContractData(feedIds, blockNumber)).map(
      (data) => data[1]?.lastValue ?? 0n
    );
  }

  async readTimestampFromContract(feedId: string, blockNumber?: number) {
    return (await this.readContractData([feedId], blockNumber))[feedId].lastDataPackageTimestampMS;
  }

  async readContractData(feedIds: string[], blockNumber?: number) {
    const data = await this.getContractData(feedIds, blockNumber);

    return Object.fromEntries(data) as ContractData;
  }

  async getUniqueSignerThreshold(blockNumber?: number) {
    return await this.client.call(
      {
        method: UNIQUE_SIGNER_COUNT_METHOD,
        contract: this.contract,
      },
      blockNumber,
      Number
    );
  }

  async readLatestUpdateBlockTimestamp(feedId: string, blockNumber?: number) {
    return (await this.getContractData([feedId], blockNumber))[0][1]!.lastBlockTimestampMS;
  }

  async getPricesFromPayload(paramsProvider: ContractParamsProvider) {
    const paramsProviders = splitParamsIntoBatches(paramsProvider);

    const promises = paramsProviders.map(async (paramsProvider) => {
      const args = await prepareCallArgs(paramsProvider);

      const sim = await this.client.call(
        {
          method: GET_PRICES_METHOD,
          contract: this.contract,
          args,
        },
        undefined,
        XdrUtils.parseGetPrices
      );

      return sim.prices;
    });

    const prices = await Promise.all(promises);

    return prices.flat();
  }

  private async getContractData(
    feedIds: string[],
    blockNumber?: number
  ): Promise<[string, LastRoundDetails | undefined][]> {
    const data = await this.client.getContractEntries(
      this.contract,
      feedIds.map(XdrUtils.stringToScVal),
      blockNumber
    );

    return _.zip(feedIds, data) as [string, LastRoundDetails | undefined][];
  }
}

async function prepareCallArgs(
  paramsProvider: ContractParamsProvider,
  metadataTimestamp = Date.now()
) {
  const feedIdsScVal = XdrUtils.mapArrayToScVec(
    paramsProvider.getDataFeedIds(),
    XdrUtils.stringToScVal
  );

  const payloadScVal = XdrUtils.numbersToScvBytes(
    await paramsProvider.getPayloadData({
      withUnsignedMetadata: true,
      metadataTimestamp,
      componentName: "stellar-connector",
    })
  );

  return [feedIdsScVal, payloadScVal];
}
