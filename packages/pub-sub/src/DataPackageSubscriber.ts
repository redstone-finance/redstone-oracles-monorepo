import { LogMonitoring, LogMonitoringType } from "@redstone-finance/internal-utils";
import { SignedDataPackage, SignedDataPackagePlainObj } from "@redstone-finance/protocol";
import {
  DataPackagesResponse,
  DataServiceIds,
  getSignersForDataServiceId,
  pickDataFeedPackagesClosestToMedian,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- add reason here, please
  type requestDataPackages,
  SignedDataPackageSchema,
} from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { cleanStalePackages, MAX_PACKAGE_STALENESS, PackageResponse } from "./common";
import { DataPackageSubscriberParams } from "./DataPackageSubscriberParams";
import { withStats } from "./decorators/withStats";
import { LastPublishedFeedState } from "./LastPublishedFeedState";
import { PubSubClient, SubscribeCallback } from "./PubSubClient";
import { RateLimitsCircuitBreaker } from "./RateLimitsCircuitBreaker";
import { ReferenceValueVerifier } from "./ReferenceValueVerifier";
import { SignedDataPackageWithSavedSigner } from "./SignedDataPackageWithSavedSigner";
import { encodeDataPackageTopic } from "./topics";

type SubscriptionCallbackFn = (dataPackages: DataPackagesResponse) => unknown;

/**
 * The DataPackageSubscriber class is responsible for aggregation and verification of packages broadcasted via mqtt.
 * The implementation MUST include all checks from {@link requestDataPackages}
 *
 * ## Behavior
 *
 * 1. Validation:
 * - Validates incoming packages against a schema
 * - Verifies signer authorization
 * - Rejects packages with timestamps <= last published timestamp
 * - Prevents duplicate packages from the same signer for a given timestamp
 *
 * 2. Package processing:
 * - Publishes immediately if packages from all signers are received
 * - Schedules delayed publication if `minimalOffChainSignersCount` is met
 * - Uses `ignoreMissingFeeds` to determine if all or some dataPackageIds must meet criteria
 * - NEVER publish a package with the same timestamp or older than the last published - this rule is enforced per DATA PACKAGE ID
 * - ALWAYS packages published together have same timestamp
 *
 * 3. Package selection:
 * - Employs `pickDataFeedPackagesClosestToMedian` to select `uniqueSignersCount` packages
 *
 * 4. Fallback mechanism (optional) {@link DataPackageSubscriber.enableFallback}
 * - Triggers if no packages are received within `maxDelayBetweenPublishes`
 * - Fetches packages via `fallbackFn` and publishes if newer than last published
 * - Runs checks at `checkInterval` frequency
 *
 * 5. Circuit breaker (optional) {@link DataPackageSubscriber.enableCircuitBreaker}
 * - Allow to specify rate limits on messages received, if limit is crossed. Unsubscribing packet is sent.
 * - If fallback is enabled DataPackageSubscriber will still continue working
 */
export class DataPackageSubscriber {
  logger = loggerFactory("data-packages-subscriber");
  subscribeCallback?: SubscriptionCallbackFn;
  readonly topics: string[] = [];
  readonly packagesPerTimestamp = new Map<number, PackageResponse>();
  private readonly scheduledPublishes = new RedstoneCommon.SetWithTTL();
  private readonly lastPublishedState: LastPublishedFeedState;
  private circuitBreaker?: RateLimitsCircuitBreaker;
  fallbackInterval?: NodeJS.Timeout;
  private readonly verifier?: ReferenceValueVerifier;

  constructor(
    readonly pubSubClient: PubSubClient,
    readonly params: DataPackageSubscriberParams
  ) {
    if (params.authorizedSigners.length === 0) {
      throw new Error("You have to provide at least one authorized signer");
    }

    if (params.authorizedSigners.length < params.uniqueSignersCount) {
      throw new Error(
        `Misconfiguration authorizedSigners.length=${params.authorizedSigners.length} has to be >= uniqueSignersCount=${params.uniqueSignersCount}`
      );
    }

    if (params.minimalOffChainSignersCount < params.uniqueSignersCount) {
      throw new Error(
        `Misconfiguration uniqueSignersCount=${params.uniqueSignersCount} has to be >=  minimalOffChainSignersCount=${params.minimalOffChainSignersCount}`
      );
    }

    this.lastPublishedState = new LastPublishedFeedState(
      params.dataPackageIds,
      Date.now() - MAX_PACKAGE_STALENESS
    );

    this.verifier = RedstoneCommon.isDefined(this.params.maxReferenceValueDeviationPercent)
      ? new ReferenceValueVerifier(
          new Set(getSignersForDataServiceId(this.params.dataServiceId as DataServiceIds)),
          this.params.maxReferenceValueDeviationPercent,
          this.params.maxReferenceValueDelayInSeconds,
          this.params.minReferenceValues
        )
      : undefined;

    for (const dataPackageId of params.dataPackageIds) {
      for (const signer of params.authorizedSigners) {
        this.topics.push(
          encodeDataPackageTopic({
            dataPackageId,
            dataServiceId: this.params.dataServiceId,
            nodeAddress: signer,
          })
        );
      }
    }
  }

  /** Packages returned by fallbackFn are not verified - use {@link requestDataPackages} for off-chain verification */
  enableFallback(
    fallbackFn: () => Promise<DataPackagesResponse>,
    maxDelayBetweenPublishes: number,
    checkInterval: number
  ) {
    this.logger.info(
      `Enabled fallback mode interval=${checkInterval} maxDelayBetweenPublishes=${maxDelayBetweenPublishes}`
    );
    // eslint-disable-next-line @typescript-eslint/no-misused-promises -- add reason here, please
    this.fallbackInterval = setInterval(async () => {
      try {
        if (this.lastPublishedState.isAnyFeedNotPublishedIn(maxDelayBetweenPublishes)) {
          LogMonitoring.warn(
            LogMonitoringType.MQTT_FALLBACK_USED,
            `Fallback triggered now=${Date.now()} lastPublishedTimestamp=${this.lastPublishedState.toString()}`,
            this.logger
          );
          const dataPackages = await fallbackFn();
          const packageTimestamp =
            Object.values(dataPackages)[0]![0].dataPackage.timestampMilliseconds;

          this.logger.debug(
            `Received package from fallbackFn packageTimestamp=${packageTimestamp}`
          );

          const newerPackagesOnly = this.lastPublishedState.filterOutNotNewerPackages(dataPackages);

          const newDataPackagesIds = Object.keys(newerPackagesOnly);

          if (newDataPackagesIds.length > 0) {
            this.logger.info(
              `Publishing packages from fallback method timestamp=${packageTimestamp} latency=${Date.now() - packageTimestamp} dataPackageIds=${newDataPackagesIds.join(",")}`
            );
            this.subscribeCallback!(dataPackages);
            this.lastPublishedState.update(Object.keys(newerPackagesOnly), packageTimestamp);
          }
        }
      } catch (e) {
        this.logger.error(`FallbackFn has failed error=${RedstoneCommon.stringifyError(e)}`);
      }
    }, checkInterval);
  }

  disableFallback() {
    clearInterval(this.fallbackInterval);
  }

  enableCircuitBreaker(circuitBreaker: RateLimitsCircuitBreaker) {
    this.circuitBreaker = circuitBreaker;
  }

  async subscribe(subscribeCallback: SubscriptionCallbackFn) {
    if (this.subscribeCallback) {
      this.logger.warn("You tried to subscribe twice using same subscriber, aborted this action");
      return;
    }
    this.subscribeCallback = subscribeCallback;

    const internalCallback: SubscribeCallback = (_topicName, messagePayload, error) => {
      this.handleCircuitBreaker();

      try {
        if (error) {
          throw new Error(error);
        }

        this.processNewPackage(messagePayload);
      } catch (e) {
        this.logger.error(
          `Failed to process new package error=${RedstoneCommon.stringifyError(e)}`
        );
      }
    };

    const finalCallback =
      this.params.statsLogIntervalMs === 0
        ? internalCallback
        : withStats({
            callback: internalCallback,
            logIntervalMs: this.params.statsLogIntervalMs,
          });

    try {
      await this.pubSubClient.subscribe(this.topics, finalCallback);
    } catch (e) {
      if (this.fallbackInterval) {
        this.logger.warn("Failed to subscribe to topics, continuing because fallback is enabled");
        return;
      } else {
        throw e;
      }
    }
    this.logger.info("Successfully subscribed to topics", this.topics);
  }

  private handleCircuitBreaker() {
    this.circuitBreaker?.recordEvent();
    if (this.circuitBreaker?.shouldBreakCircuit()) {
      this.logger.error("Rate limits crossed will unsubscribe from pub/sub");
      this.unsubscribe().catch((e) =>
        this.logger.error(`Failed to unsubscribe error=${RedstoneCommon.stringifyError(e)}`)
      );
    }
  }

  unsubscribe() {
    return this.pubSubClient.unsubscribe(this.topics);
  }

  stop() {
    this.pubSubClient.stop();
  }

  private processNewPackage(dataPackageFromMessage: unknown) {
    //schema
    RedstoneCommon.zodAssert<SignedDataPackagePlainObj>(
      SignedDataPackageSchema,
      dataPackageFromMessage
    );
    const signedDataPackage = SignedDataPackageWithSavedSigner.fromObj(dataPackageFromMessage);
    const dataPackageId = signedDataPackage.dataPackage.dataPackageId;
    const packageTimestamp = signedDataPackage.dataPackage.timestampMilliseconds;

    // check if dataPackageId is in dataPackagesIds
    // reject before signature checking to save CPU cycles
    if (!this.params.dataPackageIds.includes(dataPackageId)) {
      this.logger.debug(
        `Received package with unexpected id=${dataPackageId} expectedIds=${this.params.dataPackageIds.join(",")}`
      );
      return;
    }

    const packageSigner = signedDataPackage.recoverSignerAddress();
    signedDataPackage.packageSigner = packageSigner;

    //authorized signer
    if (!this.params.authorizedSigners.includes(packageSigner)) {
      throw new Error(
        `Failed to verify signature signer=${packageSigner} expectedSigners=${this.params.authorizedSigners.join(",")} dataPackageId=${dataPackageId} packageTimestamp=${packageTimestamp}`
      );
    }

    const description = `${packageSigner} timestamp=${packageTimestamp} dataPackageId=${dataPackageId}`;

    this.verifier?.registerDataPackage(signedDataPackage);
    if (this.verifier && !this.verifier.verifyDataPackage(signedDataPackage)) {
      this.logger.debug(`Package from ${description} was rejected after verification`);

      return;
    }

    //timestamp
    if (!this.lastPublishedState.isNewerThanLastPublished(dataPackageId, packageTimestamp)) {
      this.logger.debug(
        `Package from ${description} was rejected because packageTimestamp=${packageTimestamp} <= lastPublishedTimestamp=${this.lastPublishedState.getLastPublishTime(dataPackageId)}`
      );
      return;
    }

    const entryForTimestamp = this.packagesPerTimestamp.get(packageTimestamp) ?? {};
    entryForTimestamp[dataPackageId] ??= [];

    if (entryForTimestamp[dataPackageId].some((dp) => dp.packageSigner === packageSigner)) {
      this.logger.debug(
        `Package from ${description} was rejected because already have package from this signer`
      );
      return;
    }

    this.logger.debug(`Received and verified data package from=${description}`);

    entryForTimestamp[dataPackageId].push(signedDataPackage);
    this.packagesPerTimestamp.set(packageTimestamp, entryForTimestamp);

    if (this.hasGotPackagesFromAllSigners(entryForTimestamp)) {
      this.logger.debug(
        `Got packages from all signers timestamp=${packageTimestamp}, will try to publish instantly`
      );
      this.publish(packageTimestamp);
      return;
    }

    const key = packageTimestamp.toString();
    const hasEnoughPackages = this.hasGotPackagesFromEnoughSigners(entryForTimestamp);

    if (
      hasEnoughPackages &&
      this.params.waitMsForOtherSignersAfterMinimalSignersCountSatisfied <= 0
    ) {
      this.logger.debug(
        `Got packages from enough authorized signers timestamp=${packageTimestamp},  will try to publish instantly because waitMsForOtherSignersAfterMinimalSignersCountSatisfied is <= 0`
      );
      this.publish(packageTimestamp);
      return;
    }

    if (hasEnoughPackages && !this.scheduledPublishes.has(key)) {
      this.logger.debug(
        `Got packages from enough authorized signers timestamp=${packageTimestamp}, will try to publish in ${this.params.waitMsForOtherSignersAfterMinimalSignersCountSatisfied} [ms]`
      );
      this.scheduledPublishes.add(key, Date.now());
      setTimeout(() => {
        this.publish(packageTimestamp);
      }, this.params.waitMsForOtherSignersAfterMinimalSignersCountSatisfied);
    }
  }

  /** Can publish instantly only if already have packages for every data feed from every signer */
  private hasGotPackagesFromAllSigners(entryForTimestamp: PackageResponse) {
    return this.params.dataPackageIds.every(
      (dpId) => entryForTimestamp[dpId]?.length === this.params.authorizedSigners.length
    );
  }

  /** Check if minimalOffChainSignersCount is satisfied */
  private hasGotPackagesFromEnoughSigners(entryForTimestamp: PackageResponse) {
    const quantifier = this.params.ignoreMissingFeeds ? "some" : "every";
    return this.params.dataPackageIds[quantifier]((dpId) => {
      if (!entryForTimestamp[dpId]) {
        return false;
      }
      return entryForTimestamp[dpId].length >= this.params.minimalOffChainSignersCount;
    });
  }

  private publish(packageTimestamp: number) {
    const entryForTimestamp = this.packagesPerTimestamp.get(packageTimestamp);
    if (!entryForTimestamp) {
      this.logger.warn(`No packages available for timestamp=${packageTimestamp}`);
      return;
    }

    const packagesToPublish: DataPackagesResponse =
      this.preparePackagesBeforePublish(entryForTimestamp);
    const packageIdsToPublish = Object.keys(packagesToPublish);

    if (packageIdsToPublish.length === 0) {
      return;
    }

    this.logger.info(
      `Publishing packages timestamp=${packageTimestamp} latency=${Date.now() - packageTimestamp} dataPackageIds=${packageIdsToPublish.join(",")}`
    );

    if (!this.subscribeCallback) {
      this.logger.warn(`subscribeCallback is undefined - have already unsubscribed?`);
      return;
    }

    this.subscribeCallback(packagesToPublish);
    this.lastPublishedState.update(Object.keys(packagesToPublish), packageTimestamp);

    this.cleanPublishedAndStalePackages(packageTimestamp);
  }

  private preparePackagesBeforePublish(entryForTimestamp: PackageResponse) {
    const packagesToPublish: Record<string, SignedDataPackage[]> = {};

    for (const [dataPackageId, packages] of Object.entries(entryForTimestamp)) {
      if (!packages || packages.length < this.params.minimalOffChainSignersCount) {
        this.logger.debug(
          `Omitting dataPackageId=${dataPackageId} in published packages because not enough received=${packages ? packages.length : 0} expected=${this.params.minimalOffChainSignersCount}`
        );
        continue;
      }

      const potentialPackagesToPublish = pickDataFeedPackagesClosestToMedian(
        packages.map((dp) => dp.toObj()),
        this.params.uniqueSignersCount
      );

      if (potentialPackagesToPublish.length >= this.params.uniqueSignersCount) {
        packagesToPublish[dataPackageId] = potentialPackagesToPublish;
      }
    }
    return this.lastPublishedState.filterOutNotNewerPackages(packagesToPublish);
  }

  private cleanPublishedAndStalePackages(timestamp: number) {
    const entryForTimestamp = this.packagesPerTimestamp.get(timestamp);

    if (entryForTimestamp) {
      const onlyNewerPackages =
        this.lastPublishedState.filterOutNotNewerPackages(entryForTimestamp);

      this.packagesPerTimestamp.set(timestamp, onlyNewerPackages);
    }

    // extra clear for packages which were never published
    cleanStalePackages(this.packagesPerTimestamp);
    this.verifier?.cleanStalePackages();

    this.scheduledPublishes.removeOlderThen(Date.now());
  }
}
