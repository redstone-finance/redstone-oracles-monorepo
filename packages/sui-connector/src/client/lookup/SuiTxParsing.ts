import {
  Events,
  MULTI_FEED_RELAYER_UPDATE_FUNCTION_TYPE,
  NormalizedContractTx,
} from "@redstone-finance/multichain-kit";
import { RedstoneCommon } from "@redstone-finance/utils";
import { SuiWriteCall } from "./SuiWriteCallParsing";

export const SUI_UPDATE_ERROR_EVENT_FRAGMENT = "price_adapter::UpdateError";
export const SUI_PRICE_WRITE_EVENT_FRAGMENT = "price_adapter::PriceWrite";

interface SuiNormalizedGas {
  computationCost: string;
  storageCost: string;
  storageRebate: string;
  nonRefundableStorageFee: string;
}

interface NormalizedSuiTxBase {
  blockNumber: number;
  blockTimestamp: number;
  hash: string;
  sender: string;
  targetObjectId: string;
  writes: SuiWriteCall[];
  gasLimit: string;
  gasPrice: string;
  effectFailed: boolean;
  gasUsed: number;
  events?: Events;
}

export function computeSuiGasUsed(gas: SuiNormalizedGas) {
  return (
    Number(gas.computationCost) +
    Number(gas.storageCost) -
    Number(gas.storageRebate) +
    Number(gas.nonRefundableStorageFee)
  );
}

export function buildNormalizedSuiTx(params: NormalizedSuiTxBase) {
  const isFailed = params.effectFailed || hasSkippedFeed(params.events);

  return params.writes.map(({ feedId, payload }) => ({
    blockNumber: params.blockNumber,
    blockTimestamp: params.blockTimestamp,
    hash: params.hash,
    from: params.sender,
    to: params.targetObjectId,
    data: payload,
    gasLimit: params.gasLimit,
    gasPrice: params.gasPrice,
    isFailed,
    gasUsed: params.gasUsed / params.writes.length,
    events: pickFeedEvents(feedId, params.events),
    functionType: MULTI_FEED_RELAYER_UPDATE_FUNCTION_TYPE,
  }));
}

function hasSkippedFeed(events?: Events) {
  return Object.values(events ?? {})
    .filter(RedstoneCommon.isDefined)
    .some((entry) => !entry.updated);
}

function pickFeedEvents(feedId: string, events?: Events) {
  const entry = events?.[feedId];

  return entry ? { [feedId]: entry } : undefined;
}

export function filterSuiTxsAndCheckHasNextPage(
  allFromPage: NormalizedContractTx[],
  startBlock: number,
  endBlock: number,
  pageHasPreviousPage: boolean,
  oldestRawBlockInPage?: number
) {
  const data = allFromPage.filter(
    (tx) => tx.blockNumber >= startBlock && tx.blockNumber <= endBlock
  );

  const hasMoreInRange =
    pageHasPreviousPage &&
    (oldestRawBlockInPage === undefined || oldestRawBlockInPage >= startBlock);

  return { data, hasMoreInRange };
}

export function computeOldestBlockInPage<T>(rawNodes: T[], extractBlock: (node: T) => number) {
  const oldest = rawNodes.reduce((min, node) => {
    const blockNumber = extractBlock(node);

    return Number.isFinite(blockNumber) && blockNumber > 0 ? Math.min(min, blockNumber) : min;
  }, Number.POSITIVE_INFINITY);

  return oldest === Number.POSITIVE_INFINITY ? undefined : oldest;
}
