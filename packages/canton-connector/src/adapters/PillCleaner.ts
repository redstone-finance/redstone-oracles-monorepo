import { RedstoneCommon } from "@redstone-finance/utils";
import { CantonClient, ContractFilter } from "../CantonClient";
import {
  ARCHIVE,
  createStalenessFilter,
  IPRICE_FEED_ENTRY_TEMPLATE_NAME,
} from "../price-feed-utils";
import { isJsActiveContractEntry } from "../utils";
import { CantonContractAdapter } from "./CantonContractAdapter";

const ARCHIVE_BATCH_SIZE = 50;
const MAX_RETRIES = 3;

export class PillCleaner extends CantonContractAdapter {
  constructor(
    client: CantonClient,
    private readonly ownerClient: CantonClient,
    interfaceId = client.Defs.interfaceId,
    templateName = IPRICE_FEED_ENTRY_TEMPLATE_NAME
  ) {
    super(client, interfaceId, templateName);
  }

  protected override getContractFilter(): ContractFilter {
    return createStalenessFilter(true);
  }

  private async archiveIteration() {
    const active = await this.client.getActiveContractsData(
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
      .filter((contract) => isJsActiveContractEntry(contract))
      .map((entry) => ({
        choice: ARCHIVE,
        argument: {},
        contractId: entry.JsActiveContract.createdEvent.contractId,
      }));

    if (cmds.length === 0) {
      return false;
    }

    await this.exerciseChoices(cmds, this.getInterfaceId(), false, this.ownerClient);
    const lastActive = active[active.length - 1];

    const createdAt = isJsActiveContractEntry(lastActive.contractEntry)
      ? lastActive.contractEntry.JsActiveContract.createdEvent.createdAt
      : undefined;

    this.logger.log(`Archived ${cmds.length} contracts, last contract created at: ${createdAt}`);

    return true;
  }

  private async archiveIterationWithRetry(maxRetries: number) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.archiveIteration();
      } catch (error) {
        this.logger.error(
          `Archive iteration failed (attempt ${attempt}/${maxRetries}): ${RedstoneCommon.stringifyError(error)}`
        );

        if (attempt >= maxRetries) {
          throw error;
        }
      }
    }

    return false;
  }

  async archiveAll(maxRetries = MAX_RETRIES) {
    this.logger.log("Starting archive process");

    let keepArchiving = true;
    while (keepArchiving) {
      keepArchiving = await this.archiveIterationWithRetry(maxRetries);
    }

    this.logger.log("Archive process completed - no more stale contracts");
  }
}
