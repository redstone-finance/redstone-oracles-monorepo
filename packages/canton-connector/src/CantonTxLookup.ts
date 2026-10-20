import {
  ManifestRef,
  MULTI_FEED_RELAYER_UPDATE_FUNCTION_TYPE,
  PerManifestTxLookup,
} from "@redstone-finance/multichain-kit";
import { WRITE_PRICES_CHOICE } from "./adapters/PricesCantonContractAdapter";
import { IADAPTER_TEMPLATE_NAME } from "./adapters/PricesCantonReadOnlyAdapter";
import { CantonClient } from "./client/CantonClient";
import { combineIntoId } from "./utils/utils";

export const PUBLISH_CHOICE = "RedStoneCapsOracle_Publish";
export const REDSTONE_CAPS_ORACLE_TEMPLATE = "RedStoneCapsOracle:RedStoneCapsOracle";

export class CantonTxLookup extends PerManifestTxLookup {
  constructor(
    private readonly cantonClient: CantonClient,
    private readonly updaterPartyId?: string
  ) {
    super();
  }

  protected override async fetchForManifest(
    manifest: ManifestRef,
    startBlock: number,
    endBlock: number
  ) {
    if (!manifest.adapterContractPackageId) {
      throw new Error("CantonTxLookup requires adapterContractPackageId in manifest");
    }
    if (!this.updaterPartyId) {
      throw new Error("CantonTxLookup requires updaterPartyId in env");
    }
    const updates = (
      await this.fetchUpdates(
        this.updaterPartyId,
        manifest.adapterContractPackageId,
        startBlock,
        endBlock
      )
    ).sort((a, b) => a.block - b.block);

    return {
      data: updates.map((update) => ({
        blockNumber: update.block,
        blockTimestamp: update.timeSecs,
        hash: update.updateId,
        from: update.from,
        to: update.to,
        data: update.arg,
        gasLimit: "0",
        gasPrice: "0",
        isFailed: false,
        gasUsed: Number(update.cost ?? 0),
        functionType: MULTI_FEED_RELAYER_UPDATE_FUNCTION_TYPE,
        events: update.priceEvents,
      })),
    };
  }

  private async fetchUpdates(
    updaterPartyId: string,
    packageId: string,
    startBlock: number,
    endBlock: number
  ) {
    if (packageId === this.cantonClient.getDefs().capsOracleId) {
      return await this.cantonClient.getTransactionsForTemplate(
        updaterPartyId,
        combineIntoId(packageId, REDSTONE_CAPS_ORACLE_TEMPLATE),
        startBlock,
        endBlock,
        PUBLISH_CHOICE
      );
    }

    return await this.cantonClient.getTransactionsForInterface(
      updaterPartyId,
      combineIntoId(packageId, IADAPTER_TEMPLATE_NAME),
      startBlock,
      endBlock,
      WRITE_PRICES_CHOICE
    );
  }
}
