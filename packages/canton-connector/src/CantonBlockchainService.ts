import { BlockchainService } from "@redstone-finance/multichain-kit";
import { CantonClient } from "./CantonClient";
import {
  IADAPTER_TEMPLATE_NAME,
  WRITE_PRICES_CHOICE,
} from "./adapters/PricesCantonContractAdapter";
import { combineIntoId } from "./utils";

export class CantonBlockchainService implements BlockchainService {
  constructor(protected readonly cantonClient: CantonClient) {}

  async getBlockNumber() {
    return await this.cantonClient.getCurrentOffset();
  }

  getTransactionsInWindow(
    actAs: string,
    interfaceId: string,
    from: number,
    to: number,
    templateName = IADAPTER_TEMPLATE_NAME
  ) {
    const id = combineIntoId(interfaceId, templateName);

    return this.cantonClient.getTransactionsForInterface(actAs, id, from, to, WRITE_PRICES_CHOICE);
  }

  getTimeForBlock(): Promise<Date> {
    return Promise.resolve(new Date());
  }

  async getNormalizedBalance(_address: string, _blockNumber?: number) {
    const NORM_MULTIPLIER = 10n ** (18n - 6n); // MegaBytes to 10^18

    return BigInt(await this.cantonClient.getRemainingTraffic()) * NORM_MULTIPLIER;
  }

  async getBalance(addressOrName: string, blockTag?: number): Promise<bigint> {
    return await this.getNormalizedBalance(addressOrName, blockTag);
  }
}
