import { ContractAdapter } from "@redstone-finance/multichain-kit";
import { ContractData, ContractParamsProvider } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { AnchorReadonlyProvider } from "../client/AnchorReadonlyProvider";
import { SolanaClient } from "../client/SolanaClient";
import { bigIntFromBeBytes } from "../utils";
import { PriceAdapterContract } from "./PriceAdapterContract";

export class SolanaContractAdapter implements ContractAdapter {
  constructor(
    private contract: PriceAdapterContract,
    protected readonly client: SolanaClient
  ) {}

  static fromClientAndAddress(client: SolanaClient, address: string) {
    const provider = new AnchorReadonlyProvider(client);
    const contract = new PriceAdapterContract(address, provider, client);

    return new SolanaContractAdapter(contract, client);
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
