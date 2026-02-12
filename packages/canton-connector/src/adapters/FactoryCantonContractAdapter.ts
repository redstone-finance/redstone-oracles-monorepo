import { WriteContractAdapter } from "@redstone-finance/multichain-kit";
import { ContractData, ContractParamsProvider } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { CantonClient } from "../CantonClient";
import {
  CoreFeaturedCantonContractAdapter,
  ICORE_FEATURED_TEMPLATE_NAME,
} from "./CoreFeaturedCantonContractAdapter";
import { MultiPricePillCantonContractAdapter } from "./MultiPricePillCantonContractAdapter";
import { PillCleaner } from "./PillCleaner";
import { PricePillCantonContractAdapter } from "./PricePillCantonContractAdapter";

export class FactoryCantonContractAdapter
  extends CoreFeaturedCantonContractAdapter
  implements WriteContractAdapter
{
  private cleanerRunning = false;
  private readonly pillCleaner: PillCleaner;

  constructor(
    client: CantonClient,
    ownerClient: CantonClient,
    private contractId: string,
    interfaceId = client.Defs.featuredInterfaceId,
    templateName = ICORE_FEATURED_TEMPLATE_NAME
  ) {
    super(client, "", interfaceId, templateName);
    this.pillCleaner = new PillCleaner(client, ownerClient);
  }

  override fetchContractData() {
    return Promise.resolve({ contractId: this.contractId });
  }

  private async runCleanerCycle() {
    try {
      await this.pillCleaner.archiveAll();
    } catch (error) {
      this.logger.error(`Cleaner job failed: ${RedstoneCommon.stringifyError(error)}`);
    }

    this.cleanerRunning = false;
  }

  private startCleaner() {
    if (this.cleanerRunning) {
      return;
    }

    this.cleanerRunning = true;
    void this.runCleanerCycle();
  }

  getUniqueSignerThreshold(_offset?: number): Promise<number> {
    return Promise.resolve(3); // TODO: to be implemented in Factory
  }

  async writePricesFromPayloadToContract(paramsProvider: ContractParamsProvider) {
    this.startCleaner();

    return await this.callGetPricesFromPayloadWithoutWaiting(paramsProvider);
  }

  async readLatestUpdateBlockTimestamp(feedId?: string, offset?: number) {
    if (!feedId) {
      throw new Error("FeedId must be provided");
    }

    return (await this.readData(feedId, offset)).lastDataPackageTimestampMS;
  }

  getSignerAddress() {
    return Promise.resolve(this.client.partyId);
  }

  async readContractData(feedIds: string[], offset?: number): Promise<ContractData> {
    return await this.batchReadData(feedIds, offset);
  }

  async readPricesFromContract(paramsProvider: ContractParamsProvider, offset?: number) {
    return (
      await Promise.all(
        paramsProvider.getDataFeedIds().map((feedId) => this.readData(feedId, offset))
      )
    ).map((data) => data.lastValue);
  }

  async readTimestampFromContract(feedId: string, offset?: number) {
    return (await this.readData(feedId, offset)).lastDataPackageTimestampMS;
  }

  private async readData(feedId: string, offset: number | undefined) {
    const adapter = new PricePillCantonContractAdapter(this.client, feedId);

    return await adapter.readData(offset);
  }

  private async batchReadData(feedIds: string[], offset?: number) {
    try {
      const adapter = new MultiPricePillCantonContractAdapter(this.client, feedIds);

      return await adapter.batchReadData(offset);
    } catch (e) {
      this.logger.warn(`Error getting data from contracts: ${RedstoneCommon.stringifyError(e)}`);

      return {};
    }
  }
}
