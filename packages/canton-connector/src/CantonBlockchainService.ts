import { BlockchainServiceWithTxLookup } from "@redstone-finance/multichain-kit";
import { CantonTxLookup } from "./CantonTxLookup";
import { CantonClient } from "./client/CantonClient";

export class CantonBlockchainService implements BlockchainServiceWithTxLookup {
  constructor(protected readonly cantonClient: CantonClient) {}

  get txLookup() {
    return new CantonTxLookup(this.cantonClient);
  }

  async getBlockNumber() {
    return await this.cantonClient.getCurrentOffset();
  }

  getTimeForBlock(): Promise<Date> {
    return Promise.resolve(new Date());
  }

  async getNormalizedBalance(_address: string, _blockNumber?: number) {
    const NORM_MULTIPLIER = 10n ** (18n - 6n); // MegaBytes to 10^18

    return BigInt((await this.cantonClient.getRemainingTraffic()) ?? 0) * NORM_MULTIPLIER;
  }

  async getBalance(addressOrName: string, blockTag?: number): Promise<bigint> {
    return await this.getNormalizedBalance(addressOrName, blockTag);
  }
}
