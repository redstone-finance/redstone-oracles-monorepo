import { RedstoneCommon } from "@redstone-finance/utils";

export class SendHealthcheckCollector {
  private sentHealthChecks!: boolean[];

  constructor(
    private readonly count: number,
    private readonly param: string | undefined,
    private readonly sendHealthcheckCallback: (
      healthcheckParam?: string
    ) => Promise<void>
  ) {
    this.resetHealthChecks();
  }

  sendHealthcheck(index: number): (param?: string) => Promise<void> {
    return async (_param) => {
      RedstoneCommon.assert(index < this.count, "Index exceeded");
      this.sentHealthChecks[index] = true;

      await this.checkHealthChecks();
    };
  }

  private resetHealthChecks() {
    this.sentHealthChecks = Array.from({ length: this.count }, () => false);
  }

  private async checkHealthChecks() {
    if (this.sentHealthChecks.includes(false)) {
      return;
    }

    this.resetHealthChecks();
    await this.sendHealthcheckCallback(this.param);
  }
}
