import { ContractParamsProvider } from "@redstone-finance/sdk";

// We estimate write_prices operations as `feedIds * signers`
const MAX_WRITE_PRICES_OPS = 33;

export function splitParamsIntoBatches(paramsProvider: ContractParamsProvider) {
  const batchSize = MAX_WRITE_PRICES_OPS / paramsProvider.requestParams.uniqueSignersCount;

  return paramsProvider.splitIntoFeedBatches(batchSize);
}
