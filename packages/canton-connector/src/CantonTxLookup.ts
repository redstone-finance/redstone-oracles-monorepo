import {
  ManifestRef,
  MULTI_FEED_RELAYER_UPDATE_FUNCTION_TYPE,
  PerManifestTxLookup,
} from "@redstone-finance/multichain-kit";
import { WRITE_PRICES_CHOICE } from "./adapters/PricesCantonContractAdapter";
import { IADAPTER_TEMPLATE_NAME } from "./adapters/PricesCantonReadOnlyAdapter";
import { CantonClient } from "./client/CantonClient";
import { combineIntoId } from "./utils/utils";

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
    const interfaceId = combineIntoId(manifest.adapterContractPackageId, IADAPTER_TEMPLATE_NAME);

    const updates = (
      await this.cantonClient.getTransactionsForInterface(
        this.updaterPartyId,
        interfaceId,
        startBlock,
        endBlock,
        WRITE_PRICES_CHOICE
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
}
