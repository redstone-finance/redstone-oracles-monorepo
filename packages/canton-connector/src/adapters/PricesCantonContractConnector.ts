import { FullConnector } from "@redstone-finance/multichain-kit";
import { CantonBlockchainService } from "../CantonBlockchainService";
import { CantonClient } from "../CantonClient";
import { IADAPTER_TEMPLATE_NAME, PricesCantonContractAdapter } from "./PricesCantonContractAdapter";

export class PricesCantonContractConnector
  extends PricesCantonContractAdapter
  implements FullConnector
{
  private readonly blockchainService: CantonBlockchainService;

  constructor(
    client: CantonClient,
    updateClient: CantonClient,
    adapterId: string,
    interfaceId = client.Defs.interfaceId,
    templateName = IADAPTER_TEMPLATE_NAME
  ) {
    super(client, updateClient, adapterId, interfaceId, templateName);
    this.blockchainService = new CantonBlockchainService(client);
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
    return await this.blockchainService.getBalance(addressOrName, blockTag);
  }
}
