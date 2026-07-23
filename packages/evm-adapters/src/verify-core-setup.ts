import { BigNumber } from "@ethersproject/bignumber";
import { ContractParamsProvider, DataPackagesRequestParams } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import assert from "assert";
import { ExampleBase, ExampleBase__factory } from "../typechain-types";
import { EvmContractAdapter } from "./core/contract-interactions/EvmContractAdapter";

export const getExampleBaseContract = ExampleBase__factory.connect;

const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 3,
  waitBetweenMs: 1000,
  backOff: {
    backOffBase: 2,
  },
};
const unrecoverableErrorRegExp = /InsufficientNumberOfUniqueSigners/;

export async function verifyCoreSetup<Contract extends ExampleBase>(
  checkName: string,
  config: Omit<DataPackagesRequestParams, "dataPackagesIds">,
  dataFeedIds: string[],
  contract: Contract,
  call: (wrappedContract: Contract) => Promise<BigNumber[]>,
  beforeCall?: () => Promise<void>
) {
  console.log(`Checking ${checkName}`);

  try {
    const paramsProvider = ContractParamsProvider.forFeedIds(
      {
        ...config,
        enableEnhancedLogs: true,
        aggregateErrors: true,
        ignoreMissingFeed: true,
      },
      dataFeedIds
    );
    const {
      wrappedContract,
      packageResponse: { missingFeeds },
    } = await EvmContractAdapter.wrapContract(contract, paramsProvider);

    if (missingFeeds.length) {
      return new RedstoneCommon.UnrecoverableError(
        `⛔️Failed check ${checkName} - missing feed${RedstoneCommon.getS(missingFeeds.length)}: ${missingFeeds.join(", ")}`
      );
    }

    await beforeCall?.();

    const prices = await RedstoneCommon.retry({
      fn: () => possiblyUnrecoverableError(call(wrappedContract)),
      ...RETRY_CONFIG,
    })();

    assert.ok(
      prices.every((p) => p.gt(0)),
      `One of prices is not greater than 0`
    );
  } catch (e) {
    return new Error(`⛔️Failed check ${checkName}: ${RedstoneCommon.stringifyError(e)}`);
  }

  return undefined;
}

async function possiblyUnrecoverableError<T>(
  promise: Promise<T>,
  unrecoverablePattern = unrecoverableErrorRegExp
) {
  try {
    return await promise;
  } catch (e) {
    if (unrecoverablePattern.test(RedstoneCommon.stringifyError(e))) {
      (e as RedstoneCommon.UnrecoverableError).unrecoverable = true;
    }

    throw e;
  }
}
