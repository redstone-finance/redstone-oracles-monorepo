import type { TxLookup, TxLookupArgs } from "@redstone-finance/multichain-kit";
import { WRITE_PRICES_CHOICE } from "./adapters/PricesCantonContractAdapter";
import { IADAPTER_TEMPLATE_NAME } from "./adapters/PricesCantonReadOnlyAdapter";
import { CantonClient } from "./client/CantonClient";
import { combineIntoId } from "./utils/utils";

export class CantonTxLookup implements TxLookup {
  constructor(private readonly cantonClient: CantonClient) {}

  async fetchPage({
    adapterContractPackageId,
    walletAddresses,
    startBlock,
    endBlock,
  }: TxLookupArgs) {
    if (!adapterContractPackageId) {
      throw new Error("CantonTxLookup requires adapterContractPackageId in manifest");
    }

    const interfaceId = combineIntoId(adapterContractPackageId, IADAPTER_TEMPLATE_NAME);

    const updates = (
      await Promise.all(
        walletAddresses.map((partyId) =>
          this.cantonClient.getTransactionsForInterface(
            partyId,
            interfaceId,
            startBlock,
            endBlock,
            WRITE_PRICES_CHOICE
          )
        )
      )
    ).flat();

    updates.sort((a, b) => a.block - b.block);

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
        events: update.priceEvents,
      })),
      hasNextPage: false,
    };
  }
}
