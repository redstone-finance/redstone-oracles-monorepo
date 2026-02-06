import { ContractParamsProvider, IExtendedPricesContractAdapter } from "@redstone-finance/sdk";
import { CantonClient } from "../CantonClient";
import {
  CoreFeaturedCantonContractAdapter,
  ICORE_FEATURED_TEMPLATE_NAME,
} from "./CoreFeaturedCantonContractAdapter";
import { MultiPricePillCantonContractAdapter } from "./MultiPricePillCantonContractAdapter";
import { PricePillCantonContractAdapter } from "./PricePillCantonContractAdapter";

export class FactoryCantonContractAdapter
  extends CoreFeaturedCantonContractAdapter
  implements IExtendedPricesContractAdapter
{
  constructor(
    client: CantonClient,
    private contractId: string,
    interfaceId = client.Defs.featuredInterfaceId,
    templateName = ICORE_FEATURED_TEMPLATE_NAME
  ) {
    super(client, "", interfaceId, templateName);
  }

  override fetchContractData() {
    return Promise.resolve({ contractId: this.contractId });
  }

  getUniqueSignerThreshold(_blockNumber?: number): Promise<number> {
    return Promise.resolve(3); // TODO: to be implemented in Factory
  }

  writePricesFromPayloadToContract(paramsProvider: ContractParamsProvider) {
    return this.callGetPricesFromPayloadWithoutWaiting(paramsProvider);
  }

  async readLatestUpdateBlockTimestamp(feedId?: string, blockNumber?: number) {
    if (!feedId) {
      throw new Error("FeedId must be provided");
    }

    return (await this.readData(feedId, blockNumber)).lastDataPackageTimestampMS;
  }

  getSignerAddress() {
    return Promise.resolve(this.client.partyId);
  }

  async readContractData(feedIds: string[], blockNumber?: number) {
    return await this.batchReadData(feedIds, blockNumber);
  }

  async readPricesFromContract(paramsProvider: ContractParamsProvider, blockNumber?: number) {
    return (
      await Promise.all(
        paramsProvider.getDataFeedIds().map((feedId) => this.readData(feedId, blockNumber))
      )
    ).map((data) => data.lastValue);
  }

  async readTimestampFromContract(feedId: string, blockNumber?: number) {
    return (await this.readData(feedId, blockNumber)).lastDataPackageTimestampMS;
  }

  private async readData(feedId: string, blockNumber: number | undefined) {
    const adapter = new PricePillCantonContractAdapter(this.client, feedId);

    return await adapter.readData(blockNumber);
  }

  private async batchReadData(feedIds: string[], blockNumber?: number) {
    const adapter = new MultiPricePillCantonContractAdapter(this.client, feedIds);

    return await adapter.batchReadData(blockNumber);
  }
}
