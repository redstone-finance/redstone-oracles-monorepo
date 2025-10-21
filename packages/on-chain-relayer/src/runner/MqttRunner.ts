import { terminateWithUpdateConfigExitCode } from "@redstone-finance/internal-utils";
import {
  DataPackageSubscriber,
  DataPackageSubscriberParams,
  Mqtt5Client,
  MqttTopics,
  MultiPubSubClient,
  RateLimitsCircuitBreaker,
} from "@redstone-finance/mqtt5-client";
import {
  ContractParamsProvider,
  DataPackagesRequestParams,
  DataPackagesResponse,
  DataPackagesResponseCache,
} from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";
import { MqttDataProcessingStrategyType, RelayerConfig } from "../config/RelayerConfig";
import {
  canIgnoreMissingFeeds,
  makeDataPackagesRequestParams,
} from "../core/make-data-packages-request-params";
import { ContractFacade } from "../facade/ContractFacade";
import { getContractFacade } from "../facade/get-contract-facade";
import { IterationOptions, runIteration } from "./run-iteration";
import { BaseMqttDataProcessingStrategy } from "./strategy/BaseMqttProcessingStrategy";
import {
  MqttDataProcessingStrategy,
  MqttDataProcessingStrategyDelegate,
} from "./strategy/MqttDataProcessingStrategy";
import { TimestampMqttDataProcessingStrategy } from "./strategy/TimestampMqttDataProcessingStrategy";

export class MqttRunner implements MqttDataProcessingStrategyDelegate<RelayerConfig> {
  private subscriber?: DataPackageSubscriber;
  readonly logger = loggerFactory("relayer/mqtt-runner");
  private readonly rateLimitCircuitBreaker = new RateLimitsCircuitBreaker(1_000, 10_000);
  private shouldGracefullyShutdown: boolean = false;

  constructor(
    private readonly client: MultiPubSubClient,
    private readonly contractFacade: ContractFacade,
    private readonly strategy: MqttDataProcessingStrategy<RelayerConfig>,
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
    if (
      !RedstoneCommon.isDefined(relayerConfig.mqttEndpoint) ||
      !RedstoneCommon.isDefined(relayerConfig.mqttUpdateSubscriptionIntervalMs)
    ) {
      throw new Error(
        "Relayer is going to run with mqtt but mqttEndpoint or mqttUpdateSubscriptionIntervalMs is not set"
      );
    }

    const endpoint = relayerConfig.mqttEndpoint;
    const cache = new DataPackagesResponseCache();
    const contractFacade = await getContractFacade(relayerConfig, cache);
    const mqttClientFactory = () =>
      Mqtt5Client.create({
        endpoint,
        authorization: {
          type: "AWSSigV4",
        },
      });

    const multiClient = new MultiPubSubClient(
      mqttClientFactory,
      MqttTopics.calculateTopicCountPerConnection()
    );

    const strategy = new (
      relayerConfig.mqttDataProcessingStrategy === MqttDataProcessingStrategyType.Timestamp
        ? TimestampMqttDataProcessingStrategy<RelayerConfig>
        : BaseMqttDataProcessingStrategy<RelayerConfig>
    )(cache);

    const runner = new MqttRunner(multiClient, contractFacade, strategy, iterationOptionsOverride);
    await runner.updateSubscription(relayerConfig);

    if (relayerConfig.mqttUpdateSubscriptionIntervalMs > 0) {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      setInterval(async () => {
        await runner.updateSubscription(relayerConfig);
      }, relayerConfig.mqttUpdateSubscriptionIntervalMs);
    }

    return runner;
  }

  private async updateSubscription(relayerConfig: RelayerConfig) {
    try {
      const uniqueSignerThreshold =
        await this.contractFacade.getUniqueSignerThresholdFromContract();

      const requestParams = makeDataPackagesRequestParams(relayerConfig, uniqueSignerThreshold);

      this.logger.debug("Checking subscription", requestParams);

      await this.subscribe(requestParams, relayerConfig);
    } catch (error) {
      this.logger.error("Failed to check subscription", RedstoneCommon.stringifyError(error));
    }
  }

  private async subscribe(requestParams: DataPackagesRequestParams, relayerConfig: RelayerConfig) {
    const params = MqttRunner.prepareDataPackageSubscriberParams(requestParams, relayerConfig);

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
      !relayerConfig.mqttFallbackCheckIntervalMs ||
      !relayerConfig.mqttFallbackMaxDelayBetweenPublishesMs
    ) {
      this.logger.warn(
        `Fallback IS NOT enabled. mqttFallbackCheckIntervalMs or mqttFallbackMaxDelayBetweenPublishesMs is missing`
      );
      return;
    }

    this.subscriber!.enableFallback(
      async () => await new ContractParamsProvider(requestParams).requestDataPackages(),
      relayerConfig.mqttFallbackMaxDelayBetweenPublishesMs,
      relayerConfig.mqttFallbackCheckIntervalMs
    );
  }

  async strategyRunIteration(
    _strategy: MqttDataProcessingStrategy<RelayerConfig>,
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
    const { dataServiceId, dataPackagesIds, uniqueSignersCount, authorizedSigners } = requestParams;
    const {
      mqttMinimalOffChainSignersCount,
      mqttWaitForOtherSignersMs,
      mqttMaxReferenceValueDeviationPercent,
      mqttMaxReferenceValueDelayInSeconds,
    } = relayerConfig;

    if (!mqttMinimalOffChainSignersCount || !RedstoneCommon.isDefined(mqttWaitForOtherSignersMs)) {
      throw new Error(
        "Relayer is going to update mqtt subscription but mqttMinimalOffChainSignersCount or mqttWaitMsForOtherSignersMs is not set"
      );
    }

    RedstoneCommon.assert(dataPackagesIds, "property dataPackageIds is required in mqtt");

    return {
      dataServiceId,
      dataPackageIds: dataPackagesIds,
      uniqueSignersCount,
      authorizedSigners,
      minimalOffChainSignersCount: mqttMinimalOffChainSignersCount,
      waitMsForOtherSignersAfterMinimalSignersCountSatisfied: mqttWaitForOtherSignersMs,
      ignoreMissingFeeds: canIgnoreMissingFeeds(relayerConfig),
      maxReferenceValueDeviationPercent: mqttMaxReferenceValueDeviationPercent,
      maxReferenceValueDelayInSeconds: mqttMaxReferenceValueDelayInSeconds,
    };
  }
}
