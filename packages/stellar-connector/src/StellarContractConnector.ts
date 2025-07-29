import { IContractConnector } from "@redstone-finance/sdk";
import { loggerFactory } from "@redstone-finance/utils";
import { rpc } from "@stellar/stellar-sdk";
import { StellarRpcClient } from "./StellarRpcClient";

export abstract class StellarContractConnector<Adapter>
  implements IContractConnector<Adapter>
{
  private readonly logger = loggerFactory("stellar-price-connector");
  private readonly rpcClient: StellarRpcClient;

  constructor(private readonly rpc: rpc.Server) {
    this.rpcClient = new StellarRpcClient(rpc);
  }

  abstract getAdapter(): Promise<Adapter>;

  async getBlockNumber() {
    return (await this.rpc.getLatestLedger()).sequence;
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
