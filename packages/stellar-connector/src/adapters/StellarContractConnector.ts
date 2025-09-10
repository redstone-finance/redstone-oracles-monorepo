import { IContractConnector } from "@redstone-finance/sdk";
import { Keypair } from "@stellar/stellar-sdk";
import { StellarRpcClient } from "../stellar/StellarRpcClient";
import { StellarSigner } from "../stellar/StellarSigner";

export class StellarContractConnector<Adapter>
  implements IContractConnector<Adapter>
{
  constructor(
    private readonly rpcClient: StellarRpcClient,
    private readonly keypair?: Keypair
  ) {}

  getAdapter(): Promise<Adapter> {
    throw new Error("Must be implemented in a subclass");
  }

  async getBlockNumber() {
    return await this.rpcClient.getBlockNumber();
  }

  async waitForTransaction(txId: string) {
    try {
      await this.rpcClient.waitForTx(txId);

      return true;
    } catch {
      return false;
    }
  }

  async getNormalizedBalance(address: string) {
    const balance = await this.rpcClient.getAccountBalance(address);

    return balance * (10n ** 18n / 10n ** 7n);
  }

  async transfer(toAddress: string, amountInXlm: number) {
    if (!this.keypair) {
      throw new Error("Keypair is missing");
    }
    await this.rpcClient.transferXlm(
      new StellarSigner(this.keypair),
      toAddress,
      amountInXlm
    );
  }

  getSignerAddress() {
    if (!this.keypair) {
      throw new Error("Keypair is missing");
    }

    return Promise.resolve(this.keypair.publicKey());
  }
}
