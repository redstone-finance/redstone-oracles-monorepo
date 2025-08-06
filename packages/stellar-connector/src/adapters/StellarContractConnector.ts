import { IContractConnector } from "@redstone-finance/sdk";
import { StellarRpcClient } from "../stellar/StellarRpcClient";

export class StellarContractConnector<Adapter>
  implements IContractConnector<Adapter>
{
  constructor(private readonly rpcClient: StellarRpcClient) {}

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
}
