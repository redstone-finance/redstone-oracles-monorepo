import { ContractAdapter, WriteContractAdapter } from "@redstone-finance/multichain-kit";
import { ContractData, ContractParamsProvider, getLastRoundDetails } from "@redstone-finance/sdk";
import { FP, RedstoneCommon } from "@redstone-finance/utils";
import { Connection } from "@solana/web3.js";
import { AnchorReadonlyProvider } from "../client/AnchorReadonlyProvider";
import { SolanaClient } from "../client/SolanaClient";
import { SolanaContractUpdater } from "../client/SolanaContractUpdater";
import { PriceAdapterContract } from "./PriceAdapterContract";

export class SolanaContractAdapter implements ContractAdapter {
  constructor(private contract: PriceAdapterContract) {}

  static fromConnectionAndAddress(connection: Connection, address: string) {
    const client = new SolanaClient(connection);
    const provider = new AnchorReadonlyProvider(connection, client);
    const contract = new PriceAdapterContract(address, provider, client);

    return new SolanaContractAdapter(contract);
  }

  getPricesFromPayload(_: ContractParamsProvider): Promise<bigint[]> {
    throw new Error("Pull model not supported");
  }

  async readPricesFromContract(
    paramsProvider: ContractParamsProvider,
    slot?: number
  ): Promise<bigint[]> {
    const contractData = await this.readContractData(paramsProvider.getDataFeedIds(), slot);

    return paramsProvider
      .getDataFeedIds()
      .map((feedId) => getLastRoundDetails(contractData, feedId))
      .map((data) => data.lastValue);
  }

  async readTimestampFromContract(feedId: string, slot?: number): Promise<number> {
    const priceData = await this.contract.getPriceData(feedId, slot);

    return priceData?.timestamp.toNumber() ?? 0;
  }

  async readLatestUpdateBlockTimestamp(
    feedId?: string,
    slot?: number
  ): Promise<number | undefined> {
    if (!feedId) {
      return undefined;
    }
    const priceData = await this.contract.getPriceData(feedId, slot);

    return priceData?.writeTimestamp?.toNumber();
  }

  async readContractData(feedIds: string[], slot?: number): Promise<ContractData> {
    const multipleResult = await this.contract.getMultiplePriceData(feedIds, slot);

    const values = multipleResult.filter(RedstoneCommon.isDefined).map((result) => [
      ContractParamsProvider.unhexlifyFeedId(result.feedId),
      {
        lastDataPackageTimestampMS: result.timestamp.toNumber(),
        lastBlockTimestampMS: result.writeTimestamp?.toNumber() ?? 0,
        lastValue: toNumber(result.value),
      },
    ]);

    return Object.fromEntries(values) as ContractData;
  }

  async getUniqueSignerThreshold(slot?: number): Promise<number> {
    return await this.contract.getUniqueSignerThreshold(slot);
  }
}

export function toNumber(values: number[]): number {
  let result = 0;
  for (const value of values) {
    result = result * 256 + value;
  }
  return result;
}

export class SolanaWriteContractAdapter
  extends SolanaContractAdapter
  implements WriteContractAdapter
{
  constructor(
    contract: PriceAdapterContract,
    private readonly client: SolanaClient,
    private readonly updater: SolanaContractUpdater
  ) {
    super(contract);
  }

  async writePricesFromPayloadToContract(paramsProvider: ContractParamsProvider) {
    const res = await this.updater.writePrices(paramsProvider);

    return FP.unwrapSuccess(res).transactionHash;
  }

  async transfer(toAddress: string, amountInSol: number) {
    return await this.client.transfer(this.updater.getKeypair(), toAddress, amountInSol);
  }

  getSignerAddress(): Promise<string> {
    return Promise.resolve(this.updater.getPublicKey().toBase58());
  }
}
