import { IRedstoneContractAdapter } from "@redstone-finance/evm-adapters";
import { ContractData } from "../../types";
import { ContractFacade } from "../ContractFacade";

export class EvmContractFacade extends ContractFacade {
  async getLatestRoundContractData(
    feedIds: string[],
    blockTag: number,
    withDataFeedValues: boolean
  ): Promise<ContractData> {
    return await (
      await this.getAdapter()
    ).readLatestRoundContractData(feedIds, blockTag, withDataFeedValues);
  }

  private async getAdapter() {
    return (await this.connector.getAdapter()) as IRedstoneContractAdapter;
  }

  override async getDataFeedIds(blockTag: number): Promise<string[] | undefined> {
    return await (await this.getAdapter()).getDataFeedIds?.(blockTag);
  }
}
