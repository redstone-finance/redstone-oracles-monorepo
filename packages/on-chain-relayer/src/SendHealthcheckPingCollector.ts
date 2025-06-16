import { RedstoneCommon, sendHealthcheckPing } from "@redstone-finance/utils";

export class SendHealthcheckPingCollector {
  private sentPings!: boolean[];

  constructor(
    private count: number,
    private url?: string,
    private sendHealthcheckPingCallback = sendHealthcheckPing
  ) {
    this.resetPings();
  }

  sendHealthcheckPing(index: number): (url?: string) => Promise<void> {
    return async (_url) => {
      RedstoneCommon.assert(index < this.count, "Index exceeded");
      this.sentPings[index] = true;

      await this.checkPings();
    };
  }

  private resetPings() {
    this.sentPings = Array.from({ length: this.count }, () => false);
  }

  private async checkPings() {
    if (this.sentPings.includes(false)) {
      return;
    }

    this.resetPings();
    await this.sendHealthcheckPingCallback(this.url);
  }
}
