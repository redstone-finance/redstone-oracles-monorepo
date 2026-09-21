import { Contract } from "@stellar/stellar-sdk";
import { StellarClient } from "../client/StellarClient";

const SYMBOL_METHOD = "symbol";
const NAME_METHOD = "name";

export class StellarTokenReader {
  private readonly contract: Contract;

  constructor(
    private readonly client: StellarClient,
    contractId: string
  ) {
    this.contract = new Contract(contractId);
  }

  async symbol(blockNumber?: number) {
    return await this.client.call(
      {
        contract: this.contract,
        method: SYMBOL_METHOD,
      },
      blockNumber,
      String
    );
  }

  async name(blockNumber?: number) {
    return await this.client.call(
      {
        contract: this.contract,
        method: NAME_METHOD,
      },
      blockNumber,
      String
    );
  }
}
