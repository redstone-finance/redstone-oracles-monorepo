import { Keypair } from "@mysten/sui/cryptography";
import { FullConnector } from "@redstone-finance/multichain-kit";
import { SuiConfig } from "./config";
import { SuiBlockchainService } from "./SuiBlockchainService";
import { SuiClient } from "./SuiClient";
import { SuiWriteContractAdapter } from "./SuiContractAdapter";
import { SuiContractUpdater } from "./SuiContractUpdater";

export class SuiContractConnector extends SuiWriteContractAdapter implements FullConnector {
  static contractUpdaterCache: { [p: string]: SuiContractUpdater | undefined } = {};
  private readonly service: SuiBlockchainService;

  constructor(client: SuiClient, config: SuiConfig, keypair: Keypair) {
    super(client, SuiContractConnector.getContractUpdater(keypair, client, config), config);
    this.service = new SuiBlockchainService(client);
  }

  async getBlockNumber(): Promise<number> {
    return await this.service.getBlockNumber();
  }

  async waitForTransaction(txId: string): Promise<boolean> {
    return await this.service.waitForTransaction(txId);
  }

  getNormalizedBalance(address: string): Promise<bigint> {
    return this.service.getNormalizedBalance(address);
  }

  static getContractUpdater(keypair: Keypair, client: SuiClient, config: SuiConfig) {
    const cacheKey = keypair.toSuiAddress();
    SuiContractConnector.contractUpdaterCache[cacheKey] ??= new SuiContractUpdater(
      client,
      keypair,
      config
    );

    return SuiContractConnector.contractUpdaterCache[cacheKey];
  }

  async getBalance(address: string) {
    return await this.getNormalizedBalance(address);
  }
}
