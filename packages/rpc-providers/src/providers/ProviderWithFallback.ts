import { ErrorCode } from "@ethersproject/logger";
import {
  EventType,
  Listener,
  Provider,
  TransactionReceipt,
} from "@ethersproject/providers";
import { RedstoneCommon, loggerFactory } from "@redstone-finance/utils";
import { providers } from "ethers";
import { ChainConfig, getChainConfigByChainId } from "../chains-configs";
import { getProviderNetworkInfo } from "../common";
import { ProviderWithFallbackBase } from "./ProviderWithFallbackBase";

const logger = loggerFactory("ProviderWithFallback");

export type ProviderWithFallbackConfig = {
  unrecoverableErrors: ErrorCode[];
  providerNames?: string[];
  singleProviderOperationTimeout: number;
  allProvidersOperationTimeout: number;
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

export class ProviderWithFallback
  extends ProviderWithFallbackBase
  implements Provider
{
  public providers: readonly Provider[];
  protected readonly providerWithFallbackConfig: ProviderWithFallbackConfig;
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

  constructor(
    providers: providers.Provider[],
    config: Partial<ProviderWithFallbackConfig> = {}
  ) {
    super();
    if (providers.length < 2) {
      throw new Error("Please provide at least two providers");
    }

    this.currentProvider = providers[0];
    this.providers = Object.freeze([...providers]);
    this.providerWithFallbackConfig = { ...FALLBACK_DEFAULT_CONFIG, ...config };
    this.chainId = getProviderNetworkInfo(this.providers[0]).chainId;
    this.chainConfig = getChainConfigByChainId(this.chainId);
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
    this.saveGlobalListener(eventName, listener);
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
    return this.currentProvider.waitForTransaction(
      transactionHash,
      confirmations,
      timeout
    );
  }

  private saveGlobalListener(
    eventType: EventType,
    listener: Listener,
    once = false
  ) {
    this.globalListeners.push({ eventType, listener, once });
  }

  /**
   * To avoid copying logic of removing events from BaseProvider.
   * Just remove listeners which were removed from _currentProvider
   */
  private updateGlobalListenerAfterRemoval() {
    const allCurrentListeners = this.currentProvider.listeners();
    for (let i = 0; i < this.globalListeners.length; i++) {
      if (!allCurrentListeners.includes(this.globalListeners[i].listener)) {
        this.globalListeners.splice(i, 1);
      }
    }
  }

  protected override executeWithFallback<T = unknown>(
    fnName: string,
    ...args: unknown[]
  ): Promise<T> {
    return RedstoneCommon.timeout<T>(
      this.doExecuteWithFallback<T>(0, this.providerIndex, fnName, ...args),
      this.providerWithFallbackConfig.allProvidersOperationTimeout,
      `executeWithFallback(${fnName}) timeout after ${this.providerWithFallbackConfig.allProvidersOperationTimeout}`
    );
  }

  private async doExecuteWithFallback<T = unknown>(
    alreadyRetriedCount: number,
    lastProviderUsedIndex: number,
    fnName: string,
    ...args: unknown[]
  ): Promise<T> {
    try {
      const providerName = this.extractProviderName(this.providerIndex);
      logger.debug(
        `Executing ${fnName} with ${args.toString()} on provider: ${providerName} (retry #${alreadyRetriedCount})`
      );

      return await RedstoneCommon.timeout(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/return-await, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        (this.currentProvider as any)[fnName](...args),
        this.providerWithFallbackConfig.singleProviderOperationTimeout
      );
    } catch (error: unknown) {
      this.electNewProviderOrFail(
        error as EthersError,
        alreadyRetriedCount,
        lastProviderUsedIndex
      );
      return await this.doExecuteWithFallback(
        alreadyRetriedCount + 1,
        this.providerIndex,
        fnName,
        ...args
      );
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
    return (
      this.providerWithFallbackConfig.providerNames?.[index] ?? index.toString()
    );
  }

  private electNewProviderOrFail(
    error: EthersError,
    retryNumber: number,
    lastUsedProviderIndex: number
  ): void {
    if (
      error.code &&
      this.providerWithFallbackConfig.unrecoverableErrors.includes(error.code)
    ) {
      logger.warn(`Unrecoverable error ${error.code}, rethrowing error`);
      throw error;
    }

    const lastUsedProviderName = this.extractProviderName(
      lastUsedProviderIndex
    );

    logger.warn(
      `Provider ${lastUsedProviderName} failed with error: ${error.code} ${error.message}`
    );

    if (retryNumber === this.providers.length - 1) {
      logger.warn(`All providers failed to execute action, rethrowing error`);
      throw error;
    }

    if (lastUsedProviderIndex !== this.providerIndex) {
      const providerName = this.extractProviderName(this.providerIndex);
      return logger.debug(
        `Another concurrent request already has changed provider to ${providerName}, we do nothing.`
      );
    }

    const nextProviderIndex = (this.providerIndex + 1) % this.providers.length;
    const nextProviderName = this.extractProviderName(nextProviderIndex);

    logger.info(
      `Fallback into next provider ${nextProviderName} (${nextProviderIndex}/${this.providers.length}).`
    );

    this.useProvider(nextProviderIndex);
  }
}
