import { FullConnector } from "@redstone-finance/multichain-kit";
import { Keypair } from "@stellar/stellar-sdk";
import { StellarBlockchainService } from "../stellar/StellarBlockchainService";
import { StellarClient } from "../stellar/StellarClient";
import { StellarOperationSender } from "../stellar/StellarOperationSender";
import { StellarSigner } from "../stellar/StellarSigner";
import { StellarTxDeliveryManConfig } from "../stellar/StellarTxDeliveryManConfig";
import { StellarWriteContractAdapter } from "./StellarContractAdapter";

export class StellarContractConnector extends StellarWriteContractAdapter implements FullConnector {
  private readonly service: StellarBlockchainService;

  constructor(
    client: StellarClient,
    contractAddress: string,
    keypair: Keypair,
    config?: Partial<StellarTxDeliveryManConfig>
  ) {
    const sender = new StellarOperationSender(new StellarSigner(keypair), client, config);
    super(client, contractAddress, sender);

    this.service = new StellarBlockchainService(client);
  }

  async getBlockNumber() {
    return await this.service.getBlockNumber();
  }

  async waitForTransaction(txId: string) {
    return await this.service.waitForTransaction(txId);
  }

  async getNormalizedBalance(address: string) {
    return await this.service.getNormalizedBalance(address);
  }

  async getBalance(address: string) {
    return await this.service.getBalance(address);
  }

  async getInstanceTtl(address: string) {
    return await this.service.getInstanceTtl(address);
  }
}
