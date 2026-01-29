import { FullConnector } from "@redstone-finance/multichain-kit";
import { Connection, Keypair } from "@solana/web3.js";
import { AnchorReadonlyProvider } from "./client/AnchorReadonlyProvider";
import { SolanaClient } from "./client/SolanaClient";
import { SolanaContractUpdater } from "./client/SolanaContractUpdater";
import { DEFAULT_SOLANA_CONFIG } from "./config";
import { PriceAdapterContract } from "./price_adapter/PriceAdapterContract";
import { SolanaWriteContractAdapter } from "./price_adapter/SolanaPricesContractAdapter";
import { SolanaBlockchainService } from "./SolanaBlockchainService";

export class SolanaContractConnector extends SolanaWriteContractAdapter implements FullConnector {
  private readonly blockchainService: SolanaBlockchainService;

  constructor(
    connection: Connection,
    address: string,
    keypair: Keypair,
    config = DEFAULT_SOLANA_CONFIG
  ) {
    const client = new SolanaClient(connection);
    const provider = new AnchorReadonlyProvider(connection, client, keypair.publicKey);
    const contract = new PriceAdapterContract(address, provider, client);
    const updater = new SolanaContractUpdater(client, config, keypair, contract);

    super(contract, client, updater);

    this.blockchainService = new SolanaBlockchainService(client);
  }

  async getBlockNumber() {
    return await this.blockchainService.getBlockNumber();
  }

  async waitForTransaction(txId: string) {
    return await this.blockchainService.waitForTransaction(txId);
  }

  async getNormalizedBalance(address: string, blockNumber?: number) {
    return await this.blockchainService.getNormalizedBalance(address, blockNumber);
  }

  async getBalance(addressOrName: string, blockTag?: number) {
    return await this.blockchainService.getNormalizedBalance(addressOrName, blockTag);
  }
}
