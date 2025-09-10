import { terminateWithUpdateConfigExitCode } from "@redstone-finance/internal-utils";
import {
  DataPackageSubscriber,
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
  getDataPackagesTimestamp,
} from "@redstone-finance/sdk";
import {
  loggerFactory,
  OperationQueue,
  RedstoneCommon,
} from "@redstone-finance/utils";
import _ from "lodash";
import { RelayerConfig } from "../config/RelayerConfig";
import {
  canIgnoreMissingFeeds,
  makeDataPackagesRequestParams,
} from "../core/make-data-packages-request-params";
import { ContractFacade } from "../facade/ContractFacade";
import { getContractFacade } from "../facade/get-contract-facade";
import { IterationOptions, runIteration } from "./run-iteration";

export class MqttRunner {
  private subscriber?: DataPackageSubscriber;
  private readonly queue = new OperationQueue();
  private readonly logger = loggerFactory("relayer/mqtt-runner");
  private readonly rateLimitCircuitBreaker = new RateLimitsCircuitBreaker(
    1_000,
    10_000
  );
  private shouldGracefullyShutdown: boolean = false;

  constructor(
    private readonly client: MultiPubSubClient,
    private readonly contractFacade: ContractFacade,
    private readonly cache: DataPackagesResponseCache,
    private readonly iterationOptionsOverride: Partial<IterationOptions>
  ) {
    process.on("SIGTERM", () => {
      this.logger.info(
        "SIGTERM received, NodeRunner scheduled for a graceful shut down."
      );
      this.shouldGracefullyShutdown = true;
    });
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

    const runner = new MqttRunner(
      multiClient,
      contractFacade,
      cache,
      iterationOptionsOverride
    );
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

      const requestParams = makeDataPackagesRequestParams(
        relayerConfig,
        uniqueSignerThreshold
      );

      this.logger.debug("Checking subscription", requestParams);

      await this.subscribe(requestParams, relayerConfig);
    } catch (error) {
      this.logger.error(
        "Failed to check subscription",
        RedstoneCommon.stringifyError(error)
      );
    }
  }

  private async subscribe(
    requestParams: DataPackagesRequestParams,
    relayerConfig: RelayerConfig
  ) {
    if (
      !relayerConfig.mqttMinimalOffChainSignersCount ||
      !RedstoneCommon.isDefined(relayerConfig.mqttWaitForOtherSignersMs)
    ) {
      throw new Error(
        "Relayer is going to update mqtt subscription but mqttMinimalOffChainSignersCount or mqttWaitMsForOtherSignersMs is not set"
      );
    }

    RedstoneCommon.assert(
      requestParams.dataPackagesIds,
      "property dataPackageIds is required in mqtt"
    );

    const params = {
      dataServiceId: requestParams.dataServiceId,
      dataPackageIds: requestParams.dataPackagesIds,
      uniqueSignersCount: requestParams.uniqueSignersCount,
      minimalOffChainSignersCount:
        relayerConfig.mqttMinimalOffChainSignersCount,
      waitMsForOtherSignersAfterMinimalSignersCountSatisfied:
        relayerConfig.mqttWaitForOtherSignersMs,
      ignoreMissingFeeds: canIgnoreMissingFeeds(relayerConfig),
      authorizedSigners: requestParams.authorizedSigners,
    };

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

    await this.subscriber.subscribe(
      (dataPackagesResponse: DataPackagesResponse) => {
        this.processResponse(
          relayerConfig,
          requestParams,
          dataPackagesResponse
        );
      }
    );
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
      async () =>
        await new ContractParamsProvider(requestParams).requestDataPackages(),
      relayerConfig.mqttFallbackMaxDelayBetweenPublishesMs,
      relayerConfig.mqttFallbackCheckIntervalMs
    );
  }

  private processResponse(
    relayerConfig: RelayerConfig,
    requestParams: DataPackagesRequestParams,
    dataPackagesResponse: DataPackagesResponse
  ) {
    const dataPackageIds = Object.keys(dataPackagesResponse);
    dataPackageIds.sort();

    this.logger.debug(
      `Got data for [${dataPackageIds.toString()}], timestamp: ${getDataPackagesTimestamp(dataPackagesResponse)}`
    );

    const wasEnqueued = this.queue.enqueue(dataPackageIds.toString(), () =>
      this.runIteration(relayerConfig, dataPackagesResponse, requestParams)
    );

    if (!wasEnqueued) {
      this.cache.update(dataPackagesResponse, requestParams);
    }
  }

  private async runIteration(
    relayerConfig: RelayerConfig,
    dataPackagesResponse: DataPackagesResponse,
    requestParams: DataPackagesRequestParams
  ) {
    try {
      if (this.shouldGracefullyShutdown) {
        this.logger.info(`Shutdown scheduled, not running next iteration`);
        return;
      }
      this.cache.update(dataPackagesResponse, requestParams);
      await runIteration(
        this.contractFacade,
        relayerConfig,
        this.iterationOptionsOverride
      );
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
}
