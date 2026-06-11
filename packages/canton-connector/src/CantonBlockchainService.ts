import { BlockchainServiceWithTxLookup } from "@redstone-finance/multichain-kit";
import Decimal from "decimal.js";
import { CantonTxLookup } from "./CantonTxLookup";
import { CantonClient } from "./client/CantonClient";
import { readCantonPartyIds } from "./utils/utils";

const CC_DECIMALS_18 = new Decimal(10).pow(18);

export class CantonBlockchainService implements BlockchainServiceWithTxLookup {
  constructor(protected readonly cantonClient: CantonClient) {}

  get txLookup() {
    return new CantonTxLookup(this.cantonClient, readCantonPartyIds().updaterPartyId);
  }

  async getBlockNumber() {
    return await this.cantonClient.getCurrentOffset();
  }

  getTimeForBlock() {
    return Promise.resolve(new Date());
  }

  async getNormalizedBalance(address: string, _blockNumber?: number) {
    const ccBalance = await this.cantonClient.getAmuletBalance(address);

    return BigInt(new Decimal(ccBalance).mul(CC_DECIMALS_18).toFixed(0));
  }

  async getBalance(addressOrName: string, blockTag?: number) {
    return await this.getNormalizedBalance(addressOrName, blockTag);
  }
}
