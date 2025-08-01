import { IContractConnector } from "@redstone-finance/sdk";
import { StellarRpcClient } from "../stellar/StellarRpcClient";

export abstract class StellarContractConnector<Adapter>
  implements IContractConnector<Adapter>
{
  protected constructor(private readonly rpcClient: StellarRpcClient) {}

  abstract getAdapter(): Promise<Adapter>;

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
}
