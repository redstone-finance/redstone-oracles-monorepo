import { ContractAdapter } from "@redstone-finance/multichain-kit";
import { ContractData, LastRoundDetails } from "@redstone-finance/sdk";
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

  async readContractData(feedIds: string[], blockNumber?: number) {
    const data = await this.getContractData(feedIds, blockNumber);

    return Object.fromEntries(data) as ContractData;
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
