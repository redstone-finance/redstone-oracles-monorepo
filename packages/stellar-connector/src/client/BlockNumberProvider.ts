import { RedstoneCommon } from "@redstone-finance/utils";
import { rpc } from "@stellar/stellar-sdk";

export class BlockNumberProvider {
  private lastBlockNumber = 0;
  private getBlockNumberPromise?: Promise<number>;

  constructor(private readonly server: rpc.Server) {}

  async getBlockNumber() {
    if (this.getBlockNumberPromise) {
      return await this.getBlockNumberPromise;
    }

    this.getBlockNumberPromise = this.fetchAndValidateBlockNumber();

    try {
      return await this.getBlockNumberPromise;
    } finally {
      this.getBlockNumberPromise = undefined;
    }
  }

  private async fetchAndValidateBlockNumber() {
    const blockNumber = await this.server.getLatestLedger().then((value) => value.sequence);

    if (blockNumber < this.lastBlockNumber) {
      throw new Error(
        `Compromised block number: ${blockNumber} when ${this.lastBlockNumber} was previously set`
      );
    }

    this.lastBlockNumber = blockNumber;

    return blockNumber;
  }

  async waitForBlockNumber(blockNumber?: number) {
    if (!RedstoneCommon.isDefined(blockNumber)) {
      return;
    }

    if (this.lastBlockNumber >= blockNumber) {
      return;
    }

    await RedstoneCommon.waitForBlockNumber(this.getBlockNumber.bind(this), blockNumber);
  }
}
