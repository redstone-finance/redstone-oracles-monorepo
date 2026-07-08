import { ErrorCode } from "@ethersproject/logger";
import { EventType, Listener, Provider, TransactionReceipt } from "@ethersproject/providers";
import {
  ChainConfig,
  getChainConfigByNetworkId,
  getLocalChainConfigs,
} from "@redstone-finance/chain-configs";
import { RedstoneCommon, loggerFactory } from "@redstone-finance/utils";
import { providers } from "ethers";
import _ from "lodash";
import { getProviderNetworkInfo } from "../common";
import { ProviderWithFallbackBase } from "./ProviderWithFallbackBase";

const logger = loggerFactory("ProviderWithFallback");

export type ProviderWithFallbackConfig = {
  unrecoverableErrors: ErrorCode[];
  providerNames?: string[];
  singleProviderOperationTimeout: number;
  allProvidersOperationTimeout: number;
  chainConfig?: ChainConfig;
  reportMetric: (msg: string) => void;
};

export const FALLBACK_DEFAULT_CONFIG: ProviderWithFallbackConfig = {
  unrecoverableErrors: [
    ErrorCode.MISSING_ARGUMENT,
    ErrorCode.MISSING_NEW,
    ErrorCode.NONCE_EXPIRED,
    ErrorCode.TRANSACTION_REPLACED,
    ErrorCode.REPLACEMENT_UNDERPRICED,
  ],
  singleProviderOperationTimeout: 7_000,
  allProvidersOperationTimeout: 36_000,
  reportMetric: () => {},
};

type EthersError = Error & { code?: ErrorCode; reason?: string };

type ProviderOperation<T> = (provider: Provider) => Promise<T>;

export class ProviderWithFallback extends ProviderWithFallbackBase implements Provider {
  public providers: readonly Provider[];
  protected readonly providerWithFallbackConfig: ProviderWithFallbackConfig;
  private lastErrorTimestamp: Record<number, number> = {};
  private currentProvider: Provider;
  private providerIndex = 0;
  chainId: number;
  chainConfig: ChainConfig;

  getCurrentProviderIndex(): number {
    return this.providerIndex;
  }

  getProviderWithFallbackConfig() {
    return { ...this.providerWithFallbackConfig };
  }

  private globalListeners: {
    eventType: EventType;
    listener: Listener;
    once: boolean;
  }[] = [];

  constructor(providers: providers.Provider[], config: Partial<ProviderWithFallbackConfig> = {}) {
    super();
    if (providers.length < 2) {
      throw new Error("Please provide at least two providers");
    }

    this.currentProvider = providers[0];
    this.providers = Object.freeze([...providers]);
    this.providerWithFallbackConfig = { ...FALLBACK_DEFAULT_CONFIG, ...config };
    this.chainId = getProviderNetworkInfo(this.providers[0]).chainId;
    this.chainConfig =
      config.chainConfig ?? getChainConfigByNetworkId(getLocalChainConfigs(), this.chainId);

    // assign begin values to have deterministic behavior
    for (let providerIndex = 0; providerIndex < this.providers.length; providerIndex++) {
      this.lastErrorTimestamp[providerIndex] = performance.now() - providerIndex;
    }
  }

  override getNetwork(): Promise<providers.Network> {
    return Promise.resolve({
      chainId: this.chainId,
      name: this.chainConfig.name,
    });
  }

  override on(eventName: EventType, listener: Listener): Provider {
    this.saveGlobalListener(eventName, listener);

    return this.currentProvider.on(eventName, listener);
  }

  override once(eventName: EventType, listener: Listener): Provider {
    this.saveGlobalListener(eventName, listener, true);

    return this.currentProvider.once(eventName, listener);
  }

  override emit(eventName: EventType, ...args: unknown[]): boolean {
    return this.currentProvider.emit(eventName, ...args);
  }

  override listenerCount(eventName?: EventType): number {
    return this.currentProvider.listenerCount(eventName);
  }

  override listeners(eventName?: EventType): Listener[] {
    return this.currentProvider.listeners(eventName);
  }

  override addListener(eventName: EventType, listener: Listener): Provider {
    return this.currentProvider.addListener(eventName, listener);
  }

  override off(eventName: EventType, listener?: Listener): Provider {
    this.currentProvider.off(eventName, listener);
    this.updateGlobalListenerAfterRemoval();

    return this.currentProvider;
  }

  override removeAllListeners(eventName?: EventType): Provider {
    this.currentProvider.removeAllListeners(eventName);
    this.updateGlobalListenerAfterRemoval();

    return this.currentProvider;
  }

  override removeListener(eventName: EventType, listener: Listener): Provider {
    this.currentProvider.removeListener(eventName, listener);
    this.updateGlobalListenerAfterRemoval();

    return this.currentProvider;
  }

  override waitForTransaction(
    transactionHash: string,
    confirmations?: number,
    timeout?: number
  ): Promise<TransactionReceipt> {
    return this.currentProvider.waitForTransaction(transactionHash, confirmations, timeout);
  }

  private saveGlobalListener(eventType: EventType, listener: Listener, once = false) {
    this.globalListeners.push({ eventType, listener, once });
  }

  /**
   * To avoid copying logic of removing events from BaseProvider.
   * Just remove listeners which were removed from _currentProvider
   */
  private updateGlobalListenerAfterRemoval() {
    const allCurrentListeners = this.currentProvider.listeners();

    this.globalListeners = this.globalListeners.filter((listener) =>
      allCurrentListeners.includes(listener.listener)
    );
  }

  protected override executeWithFallback<T = unknown>(fnName: string, ...args: unknown[]) {
    return this.executeOperationWithFallback<T>(
      `${fnName} with ${JSON.stringify(args)}`,
      (provider) => ProviderWithFallback.callProviderMethod<T>(provider, fnName, args)
    );
  }

  protected override executeWithFallbackRetryingEmpty<T = unknown>(
    fnName: string,
    throwOnEmpty: boolean,
    ...args: unknown[]
  ) {
    return this.executeOperationWithFallback<T>(
      `${fnName} with ${JSON.stringify(args)}`,
      async (provider) => {
        const result = await ProviderWithFallback.callProviderMethod<T>(provider, fnName, args);
        if (throwOnEmpty && !RedstoneCommon.isDefined(result)) {
          throw new Error(`${fnName} returned an empty result`);
        }

        return result;
      }
    );
  }

  private static callProviderMethod<T>(provider: Provider, fnName: string, args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any -- generic dispatch by method name
    return (provider as any)[fnName](...args) as Promise<T>;
  }

  private executeOperationWithFallback<T>(label: string, operation: ProviderOperation<T>) {
    return RedstoneCommon.timeout(
      this.doExecuteWithFallback<T>(0, label, operation),
      this.providerWithFallbackConfig.allProvidersOperationTimeout,
      `executeWithFallback(${label}) timeout after ${this.providerWithFallbackConfig.allProvidersOperationTimeout}`
    );
  }

  private async doExecuteWithFallback<T = unknown>(
    alreadyRetriedCount: number,
    label: string,
    operation: ProviderOperation<T>
  ): Promise<T> {
    const providerIndexForThisAttempt = this.providerIndex;
    try {
      logger.debug(
        `Executing ${label} on provider: ${this.extractProviderName(this.providerIndex)} (retry #${alreadyRetriedCount})`
      );

      return await RedstoneCommon.timeout(
        operation(this.currentProvider),
        this.providerWithFallbackConfig.singleProviderOperationTimeout
      );
    } catch (error: unknown) {
      this.electNewProviderOrFail(
        error as EthersError,
        alreadyRetriedCount,
        providerIndexForThisAttempt
      );

      return await this.doExecuteWithFallback(alreadyRetriedCount + 1, label, operation);
    }
  }

  private useProvider(providerIndex: number) {
    this.currentProvider.removeAllListeners();
    this.providerIndex = providerIndex;
    this.currentProvider = this.providers[this.providerIndex];

    for (const { listener, once, eventType } of this.globalListeners) {
      if (once) {
        this.currentProvider.once(eventType, listener);
      } else {
        this.currentProvider.on(eventType, listener);
      }
    }
  }

  private extractProviderName(index: number): string {
    return this.providerWithFallbackConfig.providerNames?.[index] ?? index.toString();
  }

  private electNewProviderOrFail(
    error: EthersError,
    retryNumber: number,
    lastUsedProviderIndex: number
  ) {
    if (error.code && this.providerWithFallbackConfig.unrecoverableErrors.includes(error.code)) {
      logger.warn(`Unrecoverable error ${error.code}, rethrowing error`);

      throw error;
    }

    const lastUsedProviderName = this.extractProviderName(lastUsedProviderIndex);

    logger.warn(
      `Provider ${lastUsedProviderName} failed with error: ${error.code} ${error.message}`
    );

    if (retryNumber === this.providers.length - 1) {
      logger.warn(`All providers failed to execute action, rethrowing error`);

      throw error;
    }

    this.lastErrorTimestamp[lastUsedProviderIndex] = performance.now();

    // as next provider we choose the one which haven't failed for the longest period
    const nextProviderIndex = parseInt(
      (
        _.minBy(Object.entries(this.lastErrorTimestamp), ([_provider, timestamp]) => timestamp) as [
          string,
          number,
        ]
      )[0]
    );

    const nextProviderName = this.extractProviderName(nextProviderIndex);

    logger.debug(
      `Fallback into next provider ${nextProviderName} (${retryNumber}/${this.providers.length}).`
    );

    this.useProvider(nextProviderIndex);
  }
}
