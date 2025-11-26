import { RedstoneCommon } from "@redstone-finance/utils";
import type { DeliveryManTx, TxDeliveryOptsValidated } from "./common";

export class TxWaitingStrategy {
  constructor(
    protected opts: TxDeliveryOptsValidated,
    protected hasNonceIncreased: (tx: DeliveryManTx) => Promise<boolean>
  ) {}

  async waitForTx(tx: DeliveryManTx) {
    await this.sleepForTxMining(this.opts.expectedDeliveryTimeMs);
    await this.hasNonceIncreased(tx);

    return;
  }

  protected async sleepForTxMining(timeMs: number) {
    this.opts.logger(`Waiting ${timeMs} [MS] for mining transaction`);
    await RedstoneCommon.sleep(timeMs);
  }
}
