import { RedstoneCommon } from "@redstone-finance/utils";
import type {
  ManifestRef,
  NormalizedContractTx,
  NormalizedTopUpEntry,
  TxLookup,
  TxLookupArgs,
} from "./TxLookup";

export type TxLookupAddresses = {
  wallets: Set<string>;
  adapters: Set<string>;
  packageIds: Set<string>;
};

export abstract class RangeScanTxLookup<BlockItem> implements TxLookup {
  async fetchPage({ manifests, startBlock, endBlock }: TxLookupArgs) {
    const addresses = RangeScanTxLookup.buildAddresses(manifests);
    const items = await this.fetchItemsInRange(startBlock, endBlock, addresses.adapters);
    const [dataSettled, topUpsSettled] = await Promise.allSettled([
      this.normalizeMany(items, addresses),
      this.extractTopUps(items, addresses.wallets),
    ]);

    if (dataSettled.status === "rejected") {
      throw new Error(
        `Failed to fetch items in range [${startBlock}...${endBlock}]: ${RedstoneCommon.stringifyError(dataSettled.reason)}`
      );
    }

    return {
      data: dataSettled.value,
      topUps: getValue(topUpsSettled),
      hasNextPage: false as const,
    };
  }

  protected abstract fetchItemsInRange(
    startBlock: number,
    endBlock: number,
    manifests: Set<string>
  ): Promise<BlockItem[]>;

  protected abstract normalizeMany(
    items: BlockItem[],
    addresses: TxLookupAddresses
  ): Promise<NormalizedContractTx[]>;

  protected extractTopUps(_items: BlockItem[], _wallets: Set<string>) {
    return Promise.resolve<NormalizedTopUpEntry[] | undefined>(undefined);
  }

  private static buildAddresses(manifests: ManifestRef[]): TxLookupAddresses {
    const adapters = new Set<string>();
    const wallets = new Set<string>();
    const packageIds = new Set<string>();
    for (const manifest of manifests) {
      adapters.add(manifest.adapterContract);
      if (manifest.adapterContractPackageId) {
        packageIds.add(manifest.adapterContractPackageId);
      }
      for (const wallet of manifest.walletAddresses) {
        wallets.add(wallet);
      }
    }

    return { adapters, wallets, packageIds };
  }
}

function getValue<T>(settled: PromiseSettledResult<T>) {
  return settled.status === "rejected" ? undefined : settled.value;
}
