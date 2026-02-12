import { FullConnector } from "@redstone-finance/multichain-kit";
import { CantonBlockchainService } from "../CantonBlockchainService";
import { CantonClient } from "../CantonClient";
import { ICORE_FEATURED_TEMPLATE_NAME } from "./CoreFeaturedCantonContractAdapter";
import { FactoryCantonContractAdapter } from "./FactoryCantonContractAdapter";

export class CoreFactoryCantonContractConnector
  extends FactoryCantonContractAdapter
  implements FullConnector
{
  private readonly blockchainService: CantonBlockchainService;

  constructor(
    client: CantonClient,
    ownerClient: CantonClient,
    contractId: string,
    interfaceId = client.Defs.featuredInterfaceId,
    templateName = ICORE_FEATURED_TEMPLATE_NAME
  ) {
    super(client, ownerClient, contractId, interfaceId, templateName);
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
