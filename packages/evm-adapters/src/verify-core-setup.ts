import { ContractParamsProvider, DataPackagesRequestParams } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import assert from "assert";
import { BigNumber } from "ethers";
import { ExampleBase, ExampleBase__factory } from "../typechain-types";
import { EvmContractAdapter } from "./core/contract-interactions/EvmContractAdapter";

const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 3,
  waitBetweenMs: 1000,
  backOff: {
    backOffBase: 2,
  },
};

const feedNotPresentOrWithoutEnoughSigners = /InsufficientNumberOfUniqueSigners/;

export const getExampleBaseContract = ExampleBase__factory.connect;

async function possiblyUnrecoverableError<T>(
  promise: Promise<T>,
  unrecoverablePattern = feedNotPresentOrWithoutEnoughSigners
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

export async function verifyCoreSetup<Contract extends ExampleBase>(
  checkName: string,
  config: Omit<DataPackagesRequestParams, "dataPackagesIds" | "returnAllPackages">,
  dataFeedIds: string[],
  contract: Contract,
  call: (wrappedContract: Contract) => Promise<BigNumber[]>,
  beforeCall?: () => Promise<void>
) {
  console.log(`Checking ${checkName}`);

  try {
    const paramsProvider = new ContractParamsProvider({
      ...config,
      enableEnhancedLogs: true,
      aggregateErrors: true,
      dataPackagesIds: dataFeedIds,
      ignoreMissingFeed: true,
    });
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
