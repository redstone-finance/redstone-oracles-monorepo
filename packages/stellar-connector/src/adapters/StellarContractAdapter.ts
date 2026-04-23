import { ContractAdapter } from "@redstone-finance/multichain-kit";
import { ContractData, ContractParamsProvider, LastRoundDetails } from "@redstone-finance/sdk";
import { loggerFactory } from "@redstone-finance/utils";
import { Contract } from "@stellar/stellar-sdk";
import _ from "lodash";
import { StellarClient } from "../stellar/StellarClient";
import * as XdrUtils from "../XdrUtils";

export class StellarContractAdapter implements ContractAdapter {
  protected static logger = loggerFactory("stellar-contract-adapter");

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

  async readLatestUpdateBlockTimestamp(feedId: string, blockNumber?: number) {
    return (await this.getContractData([feedId], blockNumber))[0][1]!.lastBlockTimestampMS;
  }

  protected async getContractData(
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
