import { IContractConnector } from "@redstone-finance/sdk";
import { Keypair } from "@stellar/stellar-sdk";
import { StellarClient } from "../stellar/StellarClient";
import { StellarSigner } from "../stellar/StellarSigner";

export class StellarContractConnector<Adapter> implements IContractConnector<Adapter> {
  constructor(
    private readonly client: StellarClient,
    private readonly keypair?: Keypair
  ) {}

  getAdapter(): Promise<Adapter> {
    throw new Error("Must be implemented in a subclass");
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

  async transfer(toAddress: string, amountInXlm: number) {
    if (!this.keypair) {
      throw new Error("Keypair is missing");
    }
    await this.client.transferXlm(new StellarSigner(this.keypair), toAddress, amountInXlm);
  }

  getSignerAddress() {
    if (!this.keypair) {
      throw new Error("Keypair is missing");
    }

    return Promise.resolve(this.keypair.publicKey());
  }
}
