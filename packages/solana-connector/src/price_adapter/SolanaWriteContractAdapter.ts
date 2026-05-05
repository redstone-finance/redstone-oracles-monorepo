import { WriteContractAdapter } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP } from "@redstone-finance/utils";
import { Connection, Keypair } from "@solana/web3.js";
import { AnchorReadonlyProvider } from "../client/AnchorReadonlyProvider";
import { SolanaClient } from "../client/SolanaClient";
import { SolanaContractUpdater } from "../client/SolanaContractUpdater";
import { DEFAULT_SOLANA_CONFIG } from "../config";
import { PriceAdapterContract } from "./PriceAdapterContract";
import { SolanaContractAdapter } from "./SolanaPricesContractAdapter";

export class SolanaWriteContractAdapter
  extends SolanaContractAdapter
  implements WriteContractAdapter
{
  private readonly updater: SolanaContractUpdater;

  constructor(
    connection: Connection,
    address: string,
    keypair: Keypair,
    config = DEFAULT_SOLANA_CONFIG
  ) {
    const client = new SolanaClient(connection);
    const provider = new AnchorReadonlyProvider(connection, client, keypair.publicKey);
    const contract = new PriceAdapterContract(address, provider, client);

    super(contract, client);

    this.updater = new SolanaContractUpdater(client, config, keypair, contract);
  }

  async writePricesFromPayloadToContract(paramsProvider: ContractParamsProvider) {
    const res = await this.updater.writePrices(paramsProvider);

    return FP.unwrapSuccess(res).transactionHash;
  }

  async transfer(toAddress: string, amountInSol: number) {
    return await this.client.transfer(this.updater.getKeypair(), toAddress, amountInSol);
  }

  getSignerAddress(): Promise<string> {
    return Promise.resolve(this.updater.getPublicKey().toBase58());
  }
}
