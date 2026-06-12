import { consts } from "@redstone-finance/protocol";
import { BlockchainService } from "../BlockchainService";

export const MULTI_FEED_RELAYER_UPDATE_FUNCTION_TYPE = "multi-feed-relayer-update";
export const MULTI_FEED_RELAYER_UPDATE_FUNCTION_SIGNATURE = "0xb7a16251";

export const SELECTOR_SIG_SIZE_BYTES = 4;

export function normalizeRedStoneTxData(data: string) {
  const marker = consts.REDSTONE_MARKER_HEX_PURE;
  if (!data.includes(marker)) {
    return data;
  }

  const stripped = data.startsWith("0x") ? data.slice(2) : data;
  if (stripped.endsWith(marker)) {
    return stripped;
  }

  return stripped.slice(0, stripped.lastIndexOf(marker) + marker.length);
}

export function getFunctionSignature(tx: { data: string }) {
  const stripped = tx.data.startsWith("0x") ? tx.data.slice(2) : tx.data;

  return `0x${stripped.slice(0, SELECTOR_SIG_SIZE_BYTES * 2).toLowerCase()}`;
}

export type EventEntry = {
  name: string;
  feedId: string;
  args: unknown;
} & ({ updated: true; value: number } | { updated: false });

export type Events = { [p: string]: EventEntry | undefined };

export interface ManifestRef {
  adapterContract: string;
  adapterContractPackageId?: string;
  walletAddresses: string[];
}

export interface TxLookupArgs<C = unknown> {
  manifests: ManifestRef[];
  startBlock: number;
  endBlock: number;
  cursor?: C;
}

export interface NormalizedContractTx {
  blockNumber: number;
  blockTimestamp: number;
  hash: string;
  from: string;
  to: string;
  data: string;
  gasLimit: string;
  gasPrice: string;
  isFailed: boolean;
  gasUsed: number;
  functionSignature?: string;
  functionType?: string;
  events?: Events;
  tip?: bigint;
  tipPercentile?: number;
  blockTipPercentiles?: bigint[];
}

export interface NormalizedTopUpEntry {
  walletAddress: string;
  sender: string;
  value: bigint;
  blockTimestamp: number;
}

export type TxLookupPage<C = unknown> = {
  data: NormalizedContractTx[];
  topUps?: NormalizedTopUpEntry[];
} & ({ hasNextPage: true; nextCursor: C } | { hasNextPage: false; nextCursor?: undefined });

export interface TxLookup<C = unknown> {
  fetchPage(args: TxLookupArgs<C>): Promise<TxLookupPage<C>>;
}

export interface BlockchainServiceWithTxLookup extends BlockchainService {
  readonly txLookup: TxLookup;
}
