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
    interfaceId: string,
    from: number,
    to: number,
    templateName = IADAPTER_TEMPLATE_NAME
  ) {
    const id = combineIntoId(interfaceId, templateName);

    return this.cantonClient.getTransactionsForInterface(id, from, to, WRITE_PRICES_CHOICE);
  }

  getTimeForBlock(): Promise<Date> {
    return Promise.resolve(new Date());
  }

  getNormalizedBalance(_address: string, _blockNumber?: number): Promise<bigint> {
    throw new Error("Method not implemented.");
  }
  getBalance(_addressOrName: string, _blockTag?: number): Promise<bigint> {
    throw new Error("Method not implemented.");
  }
}
