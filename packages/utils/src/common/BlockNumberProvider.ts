import { isDefined } from "./objects";
import { waitForBlockNumber } from "./wait-for-block-number";

export abstract class BlockNumberProvider {
  protected readonly description: string = "";
  protected readonly waitingIntervalMs?: number;
  protected readonly maxIterationCount?: number;

  private lastBlockNumber = 0;
  private getBlockNumberPromise?: Promise<number>;

  protected abstract fetchBlockNumber(): Promise<number>;

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

  async waitForBlockNumber(blockNumber?: number, description = this.description) {
    if (!isDefined(blockNumber) || this.lastBlockNumber >= blockNumber) {
      return;
    }

    await waitForBlockNumber(
      this.getBlockNumber.bind(this),
      blockNumber,
      description,
      this.waitingIntervalMs,
      this.maxIterationCount
    );
  }

  private async fetchAndValidateBlockNumber() {
    const blockNumber = await this.fetchBlockNumber();

    if (blockNumber < this.lastBlockNumber) {
      throw new Error(
        `Compromised block number: ${blockNumber} when ${this.lastBlockNumber} was previously set`
      );
    }

    this.lastBlockNumber = blockNumber;

    return blockNumber;
  }
}
