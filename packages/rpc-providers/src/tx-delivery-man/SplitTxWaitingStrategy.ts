import { RedstoneCommon } from "@redstone-finance/utils";
import type { DeliveryManTx, TxDeliveryOptsValidated } from "./common";
import { TxWaitingStrategy } from "./TxWaitingStrategy";

const RETRY_CONFIG = {
  fnName: "waitForTx",
  backOff: {
    backOffBase: 0.5,
  },
}; // 0.5625 + 0.25 + 0.125 + 0.0625

const INITIAL_BACKOFF_EXPONENT = 2;

export class SplitTxWaitingStrategy extends TxWaitingStrategy {
  private readonly waitForTxConfig: {
    initialWaitBetweenFactor: number;
    totalBackoffWaitingFactor: number;
  };

  constructor(
    opts: TxDeliveryOptsValidated,
    hasNonceIncreased: (tx: DeliveryManTx) => Promise<boolean>
  ) {
    super(opts, hasNonceIncreased);

    this.waitForTxConfig = SplitTxWaitingStrategy.makeWaitForTxConfig(opts);
  }

  private static makeWaitForTxConfig(opts: TxDeliveryOptsValidated) {
    return {
      initialWaitBetweenFactor: RETRY_CONFIG.backOff.backOffBase ** INITIAL_BACKOFF_EXPONENT,
      totalBackoffWaitingFactor: Array.from(
        { length: opts.splitWaitingForTxRetries },
        (_, power) => RETRY_CONFIG.backOff.backOffBase ** (power + INITIAL_BACKOFF_EXPONENT)
      ).reduce((sum, v) => sum + v),
    };
  }

  override async waitForTx(tx: DeliveryManTx) {
    const config = this.waitForTxConfig;

    await this.sleepForTxMining(
      this.opts.expectedDeliveryTimeMs * (1 - config.totalBackoffWaitingFactor)
    );

    await RedstoneCommon.retry({
      ...RETRY_CONFIG,
      fn: () => this.hasNonceIncreased(tx),
      maxRetries: this.opts.splitWaitingForTxRetries,
      waitBetweenMs: config.initialWaitBetweenFactor * this.opts.expectedDeliveryTimeMs,
      logger: this.opts.logger,
    })();
  }
}
