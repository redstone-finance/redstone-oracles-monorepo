import { ContractAdapter } from "@redstone-finance/multichain-kit";
import { ContractData, ContractParamsProvider, getLastRoundDetails } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { Connection } from "@solana/web3.js";
import { AnchorReadonlyProvider } from "../client/AnchorReadonlyProvider";
import { SolanaClient } from "../client/SolanaClient";
import { bigIntFromBeBytes } from "../utils";
import { PriceAdapterContract } from "./PriceAdapterContract";

export class SolanaContractAdapter implements ContractAdapter {
  constructor(
    private contract: PriceAdapterContract,
    protected readonly client: SolanaClient
  ) {}

  static fromConnectionAndAddress(connection: Connection, address: string) {
    const client = new SolanaClient(connection);
    const provider = new AnchorReadonlyProvider(connection, client);
    const contract = new PriceAdapterContract(address, provider, client);

    return new SolanaContractAdapter(contract, client);
  }

  getPricesFromPayload(_: ContractParamsProvider): Promise<bigint[]> {
    throw new Error("Pull model not supported");
  }

  async readPricesFromContract(paramsProvider: ContractParamsProvider, slot?: number) {
    const contractData = await this.readContractData(paramsProvider.getDataFeedIds(), slot);

    return paramsProvider
      .getDataFeedIds()
      .map((feedId) => getLastRoundDetails(contractData, feedId))
      .map((data) => data.lastValue);
  }

  async readTimestampFromContract(feedId: string, slot?: number) {
    const priceData = await this.contract.getPriceData(feedId, slot);

    return priceData?.timestamp.toNumber() ?? 0;
  }

  async readLatestUpdateBlockTimestamp(feedId?: string, slot?: number) {
    if (!feedId) {
      return undefined;
    }
    const priceData = await this.contract.getPriceData(feedId, slot);

    return priceData?.writeTimestamp?.toNumber();
  }

  async readContractData(feedIds: string[], slot?: number) {
    const multipleResult = await this.contract.getMultiplePriceData(feedIds, slot);

    const values = multipleResult.filter(RedstoneCommon.isDefined).map((result) => [
      ContractParamsProvider.unhexlifyFeedId(result.feedId),
      {
        lastDataPackageTimestampMS: result.timestamp.toNumber(),
        lastBlockTimestampMS: result.writeTimestamp?.toNumber() ?? 0,
        lastValue: bigIntFromBeBytes(result.value),
      },
    ]);

    return Object.fromEntries(values) as ContractData;
  }

  async getUniqueSignerThreshold(slot?: number): Promise<number> {
    return await this.contract.getUniqueSignerThreshold(slot);
  }
}
