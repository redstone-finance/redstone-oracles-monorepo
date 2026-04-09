import { terminateWithUpdateConfigExitCode } from "@redstone-finance/internal-utils";
import {
  DataPackageSubscriber,
  DataPackageSubscriberParams,
  PubSubClient,
  RateLimitsCircuitBreaker,
} from "@redstone-finance/pub-sub";
import {
  ContractParamsProvider,
  DataPackagesRequestParams,
  DataPackagesResponse,
  DataPackagesResponseCache,
} from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";
import { PubSubDataProcessingStrategyType, RelayerConfig } from "../config/RelayerConfig";
import {
  canIgnoreMissingFeeds,
  makeDataPackagesRequestParams,
} from "../core/make-data-packages-request-params";
import { ContractFacade } from "../facade/ContractFacade";
import { getContractFacade } from "../facade/get-contract-facade";
import { createPubSubClient } from "./create-pub-sub-client";
import { IterationOptions, runIteration } from "./run-iteration";
import { BasePubSubDataProcessingStrategy } from "./strategy/BasePubSubProcessingStrategy";
import { OptimizedPubSubDataProcessingStrategy } from "./strategy/OptimizedPubSubDataProcessingStrategy";
import {
  PubSubDataProcessingStrategy,
  PubSubDataProcessingStrategyDelegate,
} from "./strategy/PubSubDataProcessingStrategy";
import { TimestampPubSubDataProcessingStrategy } from "./strategy/TimestampPubSubDataProcessingStrategy";

const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 3,
  waitBetweenMs: 1000,
};

export class PubSubRunner implements PubSubDataProcessingStrategyDelegate<RelayerConfig> {
  private subscriber?: DataPackageSubscriber;
  readonly logger = loggerFactory("relayer/pub-sub-runner");
  private readonly rateLimitCircuitBreaker = new RateLimitsCircuitBreaker(1_000, 10_000);
  private shouldGracefullyShutdown: boolean = false;

  constructor(
    private readonly client: PubSubClient,
    private readonly contractFacade: ContractFacade,
    private readonly strategy: PubSubDataProcessingStrategy<RelayerConfig, unknown>,
    private readonly iterationOptionsOverride: Partial<IterationOptions>
  ) {
    process.on("SIGTERM", () => {
      this.logger.info("SIGTERM received, NodeRunner scheduled for a graceful shut down.");
      this.shouldGracefullyShutdown = true;
    });

    strategy.delegate = new WeakRef(this);
  }

  static async run(
    relayerConfig: RelayerConfig,
    iterationOptionsOverride: Partial<IterationOptions>
  ) {
    const cache = new DataPackagesResponseCache();
    const contractFacade = await getContractFacade(relayerConfig, cache);
    const strategy = new (this.getStrategyClass(relayerConfig.pubSubDataProcessingStrategy))(cache);

    const pubSubClient = createPubSubClient(relayerConfig);
    const runner = new PubSubRunner(
      pubSubClient,
      contractFacade,
      strategy,
      iterationOptionsOverride
    );

    await RedstoneCommon.retry({
      ...RETRY_CONFIG,
      fn: async () => await runner.updateSubscription(relayerConfig),
      fnName: "runner.updateSubscription()",
    })();

    runner.setUpSubscriptionUpdates(relayerConfig);

    return runner;
  }

  private static getStrategyClass(pubSubDataProcessingStrategy?: PubSubDataProcessingStrategyType) {
    switch (pubSubDataProcessingStrategy) {
      case PubSubDataProcessingStrategyType.Timestamp:
        return TimestampPubSubDataProcessingStrategy<RelayerConfig>;
      case PubSubDataProcessingStrategyType.Optimized:
        return OptimizedPubSubDataProcessingStrategy<RelayerConfig>;
      default:
        return BasePubSubDataProcessingStrategy<RelayerConfig>;
    }
  }

  private setUpSubscriptionUpdates(relayerConfig: RelayerConfig) {
    if (!RedstoneCommon.isDefined(relayerConfig.pubSubUpdateSubscriptionIntervalMs)) {
      throw new Error(
        "Relayer is going to run with pub-sub but pubSubUpdateSubscriptionIntervalMs is not set"
      );
    }

    if (relayerConfig.pubSubUpdateSubscriptionIntervalMs > 0) {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises -- add reason here, please
      setInterval(async () => {
        await this.updateSubscription(relayerConfig, false);
      }, relayerConfig.pubSubUpdateSubscriptionIntervalMs);
    }
  }

  private async updateSubscription(relayerConfig: RelayerConfig, canThrow = true) {
    try {
      const uniqueSignerThreshold =
        await this.contractFacade.getUniqueSignerThresholdFromContract();

      const requestParams = makeDataPackagesRequestParams(relayerConfig, uniqueSignerThreshold);

      this.logger.debug("Checking subscription", requestParams);

      await this.subscribe(requestParams, relayerConfig);
    } catch (error) {
      this.logger.error("Failed to check subscription", RedstoneCommon.stringifyError(error));

      if (!canThrow) {
        return;
      }

      throw error;
    }
  }

  private async subscribe(requestParams: DataPackagesRequestParams, relayerConfig: RelayerConfig) {
    const params = PubSubRunner.prepareDataPackageSubscriberParams(requestParams, relayerConfig);

    if (_.isEqual(params, this.subscriber?.params)) {
      this.logger.debug("Params remain unchanged, doesn't need to resubscribe");
      return;
    }

    this.logger.info("Subscribing...", params);

    await this.subscriber?.unsubscribe();
    this.subscriber?.disableFallback();

    this.subscriber = new DataPackageSubscriber(this.client, {
      ...params,
    });
    this.maybeEnableFallback(relayerConfig, requestParams);
    this.subscriber.enableCircuitBreaker(this.rateLimitCircuitBreaker);

    await this.subscriber.subscribe((dataPackagesResponse: DataPackagesResponse) => {
      this.strategy.processResponse(relayerConfig, requestParams, dataPackagesResponse);
    });
  }

  private maybeEnableFallback(
    relayerConfig: RelayerConfig,
    requestParams: DataPackagesRequestParams
  ) {
    if (
      !relayerConfig.pubSubFallbackCheckIntervalMs ||
      !relayerConfig.pubSubFallbackMaxDelayBetweenPublishesMs
    ) {
      this.logger.warn(
        `Fallback IS NOT enabled. pubSubFallbackCheckIntervalMs or pubSubFallbackMaxDelayBetweenPublishesMs is missing`
      );
      return;
    }

    this.subscriber!.enableFallback(
      async () => await new ContractParamsProvider(requestParams).requestDataPackages(),
      relayerConfig.pubSubFallbackMaxDelayBetweenPublishesMs,
      relayerConfig.pubSubFallbackCheckIntervalMs
    );
  }

  async strategyRunIteration(
    _strategy: PubSubDataProcessingStrategy<RelayerConfig>,
    config: RelayerConfig
  ): Promise<void> {
    try {
      if (this.shouldGracefullyShutdown) {
        this.logger.info(`Shutdown scheduled, not running next iteration`);
        return;
      }

      await runIteration(this.contractFacade, config, this.iterationOptionsOverride);
    } catch (error) {
      this.logger.error(
        "Unhandled error occurred during iteration:",
        RedstoneCommon.stringifyError(error)
      );
    } finally {
      if (this.shouldGracefullyShutdown) {
        terminateWithUpdateConfigExitCode();
      }
    }
  }

  private static prepareDataPackageSubscriberParams(
    requestParams: DataPackagesRequestParams,
    relayerConfig: RelayerConfig
  ): DataPackageSubscriberParams {
    const {
      dataServiceId,
      dataPackagesIds,
      uniqueSignersCount,
      authorizedSigners,
      storageInstance,
      skipSignatureVerification,
    } = requestParams;
    const {
      pubSubMinimalOffChainSignersCount,
      pubSubWaitForOtherSignersMs,
      pubSubMaxReferenceValueDeviationPercent,
      pubSubMaxReferenceValueDelayInSeconds,
      pubSubMinReferenceValues,
    } = relayerConfig;

    if (
      !pubSubMinimalOffChainSignersCount ||
      !RedstoneCommon.isDefined(pubSubWaitForOtherSignersMs)
    ) {
      throw new Error(
        "Relayer is going to update pub-sub subscription but pubSubMinimalOffChainSignersCount or pubSubWaitForOtherSignersMs is not set"
      );
    }

    RedstoneCommon.assert(dataPackagesIds, "property dataPackageIds is required in pub-sub");

    return {
      dataServiceId,
      dataPackageIds: dataPackagesIds,
      uniqueSignersCount,
      authorizedSigners,
      skipSignatureVerification,
      storageInstance,
      minimalOffChainSignersCount: pubSubMinimalOffChainSignersCount,
      waitMsForOtherSignersAfterMinimalSignersCountSatisfied: pubSubWaitForOtherSignersMs,
      ignoreMissingFeeds: canIgnoreMissingFeeds(relayerConfig),
      maxReferenceValueDeviationPercent: pubSubMaxReferenceValueDeviationPercent,
      maxReferenceValueDelayInSeconds: pubSubMaxReferenceValueDelayInSeconds,
      minReferenceValues: pubSubMinReferenceValues,
    };
  }
}
