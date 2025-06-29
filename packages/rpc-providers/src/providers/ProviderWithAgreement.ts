import { BlockTag, TransactionRequest } from "@ethersproject/abstract-provider";
import { Deferrable } from "@ethersproject/properties";
import {
  CuratedRpcList,
  loggerFactory,
  RedstoneCommon,
  RedstoneLogger,
  RpcIdentifier,
} from "@redstone-finance/utils";
import { BigNumber, providers, utils } from "ethers";
import _ from "lodash";
import { convertBlockTagToNumber, getProviderNetworkInfo } from "../common";
import {
  ProviderWithFallback,
  ProviderWithFallbackConfig,
} from "./ProviderWithFallback";

const MAX_BLOCK_TIME_AHEAD_HOURS = 72;
const MAX_BLOCK_STALENESS = RedstoneCommon.minToMs(3);

interface ProviderWithAgreementSpecificConfig {
  numberOfProvidersThatHaveToAgree: number;
  minimalProvidersCount: number;
  getBlockNumberTimeoutMS: number;
  ignoreAgreementOnInsufficientResponses: boolean;
  electBlockFn: (
    blockNumbers: number[],
    healthyProvidersCount: number,
    chainId: number
  ) => number;
  enableRpcCuratedList: boolean;
  requireExplicitBlockTag: boolean;
  pickResultIfErrorFnPerContract?: PickResultIfErrorFnPerContract;
}

export type ProviderWithAgreementConfig = Partial<
  ProviderWithAgreementSpecificConfig & ProviderWithFallbackConfig
>;

export type PickResultIfErrorFnPerContract = Record<
  string,
  PickResultIfErrorFn
>;

type PickResultIfErrorFn = (
  blockNumberPerResult: Map<string, number>
) => string | null;

interface ResultWithBlockNumberPerResult {
  result: string;
  blockNumberFromProvider: number;
}

const DEFAULT_ELECT_BLOCK_FN = (blockNumbers: number[]): number => {
  blockNumbers.sort((a, b) => a - b);
  const mid = Math.floor(blockNumbers.length / 2);

  return blockNumbers.length % 2 !== 0
    ? blockNumbers[mid]
    : Math.round((blockNumbers[mid - 1] + blockNumbers[mid]) / 2);
};

const defaultConfig: ProviderWithAgreementSpecificConfig = {
  ignoreAgreementOnInsufficientResponses: false,
  numberOfProvidersThatHaveToAgree: 2,
  getBlockNumberTimeoutMS: 1_500,
  electBlockFn: DEFAULT_ELECT_BLOCK_FN,
  enableRpcCuratedList: false,
  minimalProvidersCount: 3,
  requireExplicitBlockTag: true,
};

type ProviderWithIdentifier = {
  provider: providers.Provider;
  identifier: string;
};

export class ProviderWithAgreement extends ProviderWithFallback {
  readonly agreementConfig: ProviderWithAgreementSpecificConfig;
  readonly curatedRpcList?: CuratedRpcList;
  readonly providersWithIdentifier: readonly ProviderWithIdentifier[];
  readonly lastBlockNumberForProvider: Record<
    string,
    { blockNumber: number; changedAt: number } | undefined
  > = {};
  readonly logger: RedstoneLogger;

  constructor(
    providers: providers.Provider[],
    config: ProviderWithAgreementConfig = {}
  ) {
    super(providers, config);
    this.agreementConfig = {
      ...defaultConfig,
      ...config,
    };

    const numberOfProvidersThatHaveToAgree =
      this.agreementConfig.numberOfProvidersThatHaveToAgree;

    this.validateProvidersCount(numberOfProvidersThatHaveToAgree, providers);

    this.providersWithIdentifier = Object.freeze(
      this.providers.map((provider, index) => ({
        provider,
        identifier: getProviderNetworkInfo(provider, {
          url: index.toString(),
          chainId: 1,
        }).url,
      }))
    );

    if (this.agreementConfig.enableRpcCuratedList) {
      this.curatedRpcList = new CuratedRpcList(
        {
          rpcIdentifiers: this.providersWithIdentifier.map((p) => p.identifier),
          minimalProvidersCount:
            config.minimalProvidersCount ??
            numberOfProvidersThatHaveToAgree + 1,
        },
        this.chainId
      );
    }

    this.logger = loggerFactory(`ProviderWithAgreement-${this.chainId}`);
  }

  private validateProvidersCount(
    numberOfProvidersThatHaveToAgree: number,
    providers: providers.Provider[]
  ) {
    if (providers.length < 2) {
      throw new Error("Please provide at least two providers");
    }

    if (numberOfProvidersThatHaveToAgree > this.providers.length) {
      throw new Error(
        "numberOfProvidersWhichHaveToAgree should be greater then supplied providers count"
      );
    }
  }

  /** MUST always return shallow copy */
  getHealthyProviders(): readonly ProviderWithIdentifier[] {
    if (!this.curatedRpcList) {
      return [...this.providersWithIdentifier];
    }
    const chosenProviderIdentifiers = this.curatedRpcList.getBestProviders();

    return this.providersWithIdentifier.filter(({ identifier }) =>
      chosenProviderIdentifiers.includes(identifier)
    );
  }

  updateScore(identifier: RpcIdentifier, error: boolean) {
    if (this.curatedRpcList) {
      this.curatedRpcList.scoreRpc(identifier, { error });
    }
  }

  override async getBlockNumber(): Promise<number> {
    const healthyProviders = this.getHealthyProviders();

    const blockNumbersResults = await Promise.allSettled(
      healthyProviders.map(async ({ provider, identifier }) => {
        const blockNumber = await RedstoneCommon.timeout(
          withDebugLog(() => provider.getBlockNumber(), {
            description: `rpc=${identifier} op=getBlockNumber`,
            logValue: true,
            logger: this.logger,
          }),
          this.agreementConfig.getBlockNumberTimeoutMS
        );
        this.assertValidBlockNumber(blockNumber, identifier);
        this.updateLastBlockNumber(identifier, blockNumber);

        const prevBlockResult = this.lastBlockNumberForProvider[identifier];
        if (prevBlockResult) {
          RedstoneCommon.assert(
            Date.now() - prevBlockResult.changedAt < MAX_BLOCK_STALENESS,
            `provider=${identifier} hasn't changed block number for ${Date.now() - prevBlockResult.changedAt}`
          );
        }

        return blockNumber;
      })
    );

    const blockNumbers = blockNumbersResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    if (blockNumbers.length === 0) {
      throw new AggregateError(
        blockNumbersResults.map(
          (result, index) =>
            new Error(
              `${healthyProviders[index].identifier}: ${String((result as PromiseRejectedResult).reason)}`
            )
        ),
        `All providers failed to fetch 'getBlockNumber'`
      );
    }

    const electedBlockNumber = this.agreementConfig.electBlockFn(
      blockNumbers,
      healthyProviders.length,
      this.chainId
    );

    this.logger.debug("block number election", {
      blockNumbers,
      electedBlockNumber,
    });

    return electedBlockNumber;
  }

  private updateLastBlockNumber(identifier: string, blockNumber: number) {
    this.lastBlockNumberForProvider[identifier] ??= {
      blockNumber,
      changedAt: Date.now(),
    };

    if (
      this.lastBlockNumberForProvider[identifier].blockNumber !== blockNumber
    ) {
      this.lastBlockNumberForProvider[identifier] = {
        blockNumber,
        changedAt: Date.now(),
      };
    }
  }

  override async call(
    transaction: Deferrable<TransactionRequest>,
    blockTag?: BlockTag
  ): Promise<string> {
    RedstoneCommon.assert(
      blockTag || !this.agreementConfig.requireExplicitBlockTag,
      "When using providerWithAgreement, blockTag has to be passed explicitly"
    );
    blockTag ??= await this.getBlockNumber();
    const electedBlockTag = utils.hexlify(blockTag);

    const callResult = RedstoneCommon.timeout(
      this.executeCallWithAgreement(transaction, electedBlockTag),
      this.providerWithFallbackConfig.allProvidersOperationTimeout,
      `Agreement provider after ${this.providerWithFallbackConfig.allProvidersOperationTimeout} [ms] during call`
    );

    return await callResult;
  }

  override async getBalance(
    address: string,
    blockTag?: BlockTag
  ): Promise<BigNumber> {
    RedstoneCommon.assert(
      blockTag || !this.agreementConfig.requireExplicitBlockTag,
      "When using providerWithAgreement, blockTag has to be passed explicitly"
    );
    blockTag ??= await this.getBlockNumber();
    const getBalance = async ({ provider }: ProviderWithIdentifier) => ({
      result: await provider
        .getBalance(address, blockTag)
        .then((r) => r.toString()),
      blockNumberFromProvider: Number(blockTag.toString()),
    });

    const agreedResult = await this.executeWithAgreement(
      getBalance,
      "getBalance",
      convertBlockTagToNumber(blockTag)
    );

    const parsedResult = BigNumber.from(agreedResult);

    return parsedResult;
  }

  private assertValidBlockNumber(
    blockNumber: number,
    providerIdentifier: string
  ) {
    const prevBlockResult = this.lastBlockNumberForProvider[providerIdentifier];

    RedstoneCommon.assert(
      blockNumber > 0,
      `provider=${providerIdentifier} returned block_number=${blockNumber}, block_number must be > 0`
    );

    if (RedstoneCommon.isDefined(prevBlockResult)) {
      const { blockNumber: prevBlockNumber } = prevBlockResult;
      RedstoneCommon.assert(
        prevBlockNumber <= blockNumber,
        `provider=${providerIdentifier} returned block_number=${blockNumber} previous_one=${prevBlockNumber}, block_number can't be < previous_one`
      );

      RedstoneCommon.assert(
        (blockNumber - prevBlockNumber) * this.chainConfig.avgBlockTimeMs <
          RedstoneCommon.hourToMs(MAX_BLOCK_TIME_AHEAD_HOURS),
        `provider=${providerIdentifier} returned block_number=${blockNumber} previous_one=${prevBlockNumber}, blockNumber can't be ahead more than ${MAX_BLOCK_TIME_AHEAD_HOURS} hours from previous one`
      );
    }
  }

  private async executeCallWithAgreement(
    transaction: Deferrable<TransactionRequest>,
    electedBlockTag: BlockTag
  ): Promise<string> {
    const electedBlockNumber = convertBlockTagToNumber(electedBlockTag);

    const syncThenCall = async (
      { provider, identifier }: ProviderWithIdentifier,
      shouldAbort: () => boolean
    ) => {
      const blockNumberFromProvider = await provider.getBlockNumber();
      while (!shouldAbort() && blockNumberFromProvider < electedBlockNumber) {
        await RedstoneCommon.sleep(500);
      }
      if (shouldAbort()) {
        throw new Error(
          `Provider ${identifier} failed to sync to block ${electedBlockNumber}`
        );
      }

      return {
        result: await provider.call(transaction, electedBlockTag),
        blockNumberFromProvider,
      };
    };

    const agreedResult = await this.executeWithAgreement(
      syncThenCall,
      "call",
      electedBlockNumber,
      this.agreementConfig.pickResultIfErrorFnPerContract?.[
        transaction.to as string
      ]
    );

    return agreedResult;
  }

  private executeWithAgreement(
    operation: (
      provider: ProviderWithIdentifier,
      shouldAbort: () => boolean
    ) => Promise<ResultWithBlockNumberPerResult>,
    operationName: string,
    electedBlockNumber: number,
    pickResultIfErrorFn?: PickResultIfErrorFn
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const errors: Error[] = [];
      const results = new Map<string, number>();
      const blockNumberPerResult = new Map<string, number>();
      let globalAbort = false;
      let finishedProvidersCount = 0;

      const healthyProviders = this.getHealthyProviders();

      const executeOperation = async (provider: ProviderWithIdentifier) => {
        const currentResult = await this.executeOperation(
          operation,
          provider,
          () => globalAbort,
          operationName
        );

        const currentResultCount = results.get(currentResult.result);

        // handle block number separately because it is for hyperevm hack
        const currentBlockNumber = blockNumberPerResult.get(
          currentResult.result
        );
        if (currentBlockNumber) {
          blockNumberPerResult.set(
            currentResult.result,
            Math.max(currentBlockNumber, currentResult.blockNumberFromProvider)
          );
        } else {
          blockNumberPerResult.set(
            currentResult.result,
            currentResult.blockNumberFromProvider
          );
        }

        if (currentResultCount) {
          results.set(currentResult.result, currentResultCount + 1);
          // we have found satisfying number of same responses
          if (
            currentResultCount + 1 >=
            this.agreementConfig.numberOfProvidersThatHaveToAgree
          ) {
            globalAbort = true;
            resolve(currentResult.result);
          }
        } else {
          results.set(currentResult.result, 1);
        }
      };

      const handleProviderResult = () => {
        finishedProvidersCount++;
        if (finishedProvidersCount === healthyProviders.length) {
          globalAbort = true;
          if (
            this.agreementConfig.ignoreAgreementOnInsufficientResponses &&
            results.size > 0
          ) {
            resolve(pickResponseWithMostVotes(results));
          } else {
            if (pickResultIfErrorFn) {
              const result = pickResultIfErrorFn(blockNumberPerResult);
              if (result) {
                this.logger.log(
                  `USED HYPEREVM HACK FOR AGREEMENT PROVIDER - picked results which are close enough to other, results: ${JSON.stringify(Object.fromEntries(results))}, blockNumberPerResult: ${JSON.stringify(Object.fromEntries(blockNumberPerResult))}, result: ${result}`
                );
                return resolve(result);
              }
            }
            reject(
              this.createAgreementError(
                errors,
                operationName,
                electedBlockNumber,
                healthyProviders,
                results
              )
            );
          }
        }
      };

      const executeOperationOnProvider = async (
        rpc: ProviderWithIdentifier
      ) => {
        try {
          await withDebugLog(() => executeOperation(rpc), {
            description: `rpc=${rpc.identifier} op=${operationName}`,
            logger: this.logger,
            logValue: false,
          });
          this.updateScore(rpc.identifier, false);
        } catch (e) {
          errors.push(e as Error);
          this.updateScore(rpc.identifier, true);
        } finally {
          handleProviderResult();
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      healthyProviders.forEach(executeOperationOnProvider);
    });
  }

  private createAgreementError(
    errors: Error[],
    operationName: string,
    electedBlockNumber: number,
    healthyProviders: readonly ProviderWithIdentifier[],
    results: Map<string, number>
  ): AggregateError {
    const successfulResponsesCount = healthyProviders.length - errors.length;

    let extraMessage = "";
    // we attach additional debug log in case of disagreeing providers
    if (
      successfulResponsesCount >= this.agreementConfig.minimalProvidersCount
    ) {
      extraMessage = `Providers results: ${JSON.stringify(Object.fromEntries(results.entries()))}`;
    }

    return new AggregateError(
      errors,
      `operation=${operationName} Failed to find at least ${this.agreementConfig.numberOfProvidersThatHaveToAgree} agreeing providers at block ${electedBlockNumber}; ${successfulResponsesCount} providers responded with success; ${extraMessage}`
    );
  }

  private async executeOperation(
    operation: (
      provider: ProviderWithIdentifier,
      shouldAbort: () => boolean
    ) => Promise<ResultWithBlockNumberPerResult>,
    provider: ProviderWithIdentifier,
    globalAbort: () => boolean,
    operationName: string
  ) {
    let singleProviderAbort = false;
    const shouldAbort = () => globalAbort() || singleProviderAbort;
    try {
      return await RedstoneCommon.timeout(
        operation(provider, shouldAbort),
        this.providerWithFallbackConfig.singleProviderOperationTimeout,
        `provider=${provider.identifier} ${operationName} timeout after ${this.providerWithFallbackConfig.singleProviderOperationTimeout}`
      );
    } catch (e) {
      singleProviderAbort = true;
      throw e;
    }
  }
}

// We are passing op as a function instead of promise to measure also synchronous operation time
async function withDebugLog<T>(
  op: () => Promise<T>,
  opts = {
    logValue: false,
    description: "",
    logger: loggerFactory("defaultLogger"),
  }
) {
  const start = performance.now();

  try {
    const result = await op();
    opts.logger.debug(`${opts.description}`, {
      duration: performance.now() - start,
      value: opts.logValue ? result : "hidden",
    });
    return result;
  } catch (e) {
    opts.logger.debug(`${opts.description}`, {
      duration: performance.now() - start,
      error: RedstoneCommon.stringifyError(e),
    });
    throw e;
  }
}

function pickResponseWithMostVotes(dataToVotes: Map<string, number>): string {
  const best = _.maxBy(
    [...dataToVotes.entries()],
    ([_data, voteCount]) => voteCount
  );

  return RedstoneCommon.assertThenReturn(
    best?.[0],
    "pickResponseWithMostVotes expect as least one entry in map"
  );
}
