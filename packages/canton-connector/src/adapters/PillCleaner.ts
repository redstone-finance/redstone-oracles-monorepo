import { RedstoneCommon } from "@redstone-finance/utils";
import { CantonClient } from "../client/CantonClient";
import {
  ARCHIVE_CHOICE,
  ContractFilter,
  createStalenessFilter,
  IPRICE_PILL_TEMPLATE_NAME,
} from "../utils/price-feed-utils";
import { CantonContractAdapter, RETRY_CONFIG } from "./CantonContractAdapter";

const ARCHIVE_BATCH_SIZE = 200;

export class PillCleaner extends CantonContractAdapter {
  constructor(
    client: CantonClient,
    private readonly viewerPartyId: string,
    private readonly ownerPartyId: string,
    interfaceId = client.Defs.pricePillInterfaceId,
    templateName = IPRICE_PILL_TEMPLATE_NAME
  ) {
    super(client, interfaceId, templateName);
  }
  protected override getContractFilter(): ContractFilter {
    return createStalenessFilter(true);
  }

  private async archiveIteration() {
    const active = await this.client.getActiveContractsData(
      this.viewerPartyId,
      this.getInterfaceId(),
      createStalenessFilter(false),
      undefined,
      ARCHIVE_BATCH_SIZE
    );

    if (active.length === 0) {
      return false;
    }

    this.logger.log(`Found ${active.length} stale contracts to archive`);

    const cmds = active
      .map((contract) => contract.contractEntry)
      .map((entry) => ({
        choice: ARCHIVE_CHOICE,
        argument: {},
        contractId: entry.JsActiveContract.createdEvent.contractId,
      }));

    if (cmds.length === 0) {
      return false;
    }

    await this.exerciseChoices(this.ownerPartyId, cmds, this.getInterfaceId(), {
      withRetry: true,
    });

    const lastActive = active[active.length - 1];
    const createdAt = lastActive.contractEntry.JsActiveContract.createdEvent.createdAt;
    this.logger.log(`Archived ${cmds.length} contracts, last contract created at: ${createdAt}`);

    return true;
  }

  async archiveAll() {
    this.logger.log("Starting archive process");

    let keepArchiving = true;
    while (keepArchiving) {
      keepArchiving = await RedstoneCommon.retry({
        fn: () => this.archiveIteration(),
        ...RETRY_CONFIG,
      })();
    }

    this.logger.log("Archive process completed - no more stale contracts");
  }
}
