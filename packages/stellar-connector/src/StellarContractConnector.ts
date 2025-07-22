import {
  IContractConnector,
  IPricesContractAdapter,
} from "@redstone-finance/sdk";
import { loggerFactory } from "@redstone-finance/utils";
import { Keypair, rpc } from "@stellar/stellar-sdk";
import { StellarContractAdapter } from "./StellarContractAdapter";
import { StellarRpcClient } from "./StellarRpcClient";

export class StellarContractConnector
  implements IContractConnector<IPricesContractAdapter>
{
  private readonly logger = loggerFactory("stellar-price-connector");
  private readonly adapter: StellarContractAdapter;
  private readonly rpcClient: StellarRpcClient;

  constructor(
    private readonly rpc: rpc.Server,
    keypair: Keypair,
    contractAddress: string
  ) {
    this.rpcClient = new StellarRpcClient(rpc);
    this.adapter = new StellarContractAdapter(rpc, keypair, contractAddress);
  }

  async getAdapter() {
    return await Promise.resolve(this.adapter);
  }

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
