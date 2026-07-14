import { MultiTxDeliveryManConfig } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider, DataPackagesRequestParams } from "@redstone-finance/sdk";

// We estimate write_prices operations as `feedIds * signers`
const MAX_WRITE_PRICES_OPS = 33;

export const MULTI_TX_DELIVERY_MAN_CONFIG: MultiTxDeliveryManConfig = {
  maxParallelTxCount: 1,
  batchSizePerRequestParams,
};

export function splitParamsIntoBatches(paramsProvider: ContractParamsProvider) {
  const batchSize = batchSizePerRequestParams(paramsProvider.requestParams);

  return paramsProvider.splitIntoFeedBatches(batchSize);
}

function batchSizePerRequestParams(requestParams: DataPackagesRequestParams) {
  return Math.max(1, Math.floor(MAX_WRITE_PRICES_OPS / requestParams.uniqueSignersCount));
}
