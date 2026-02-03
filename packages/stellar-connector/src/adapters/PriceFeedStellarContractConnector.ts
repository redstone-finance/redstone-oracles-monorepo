import { Contract } from "@stellar/stellar-sdk";
import { StellarClient } from "../stellar/StellarClient";
import { PriceFeedStellarContractAdapter } from "./PriceFeedStellarContractAdapter";

export class PriceFeedStellarContractConnector {
  private readonly priceFeedAdapter: PriceFeedStellarContractAdapter;

  constructor(
    private readonly client: StellarClient,
    contractAddress: string
  ) {
    this.priceFeedAdapter = new PriceFeedStellarContractAdapter(
      client,
      new Contract(contractAddress)
    );
  }

  getAdapter() {
    return Promise.resolve(this.priceFeedAdapter);
  }
  async getBlockNumber() {
    return await this.client.getBlockNumber();
  }

  async waitForTransaction(txId: string) {
    try {
      await this.client.waitForTx(txId);

      return true;
    } catch {
      return false;
    }
  }

  async getNormalizedBalance(address: string) {
    const balance = await this.client.getAccountBalance(address);

    const NORMALIZED_BALANCE_MULTIPLIER = 10n ** (18n - 7n);
    return balance * NORMALIZED_BALANCE_MULTIPLIER;
  }

  async getBalance(address: string) {
    return await this.getNormalizedBalance(address);
  }
}
