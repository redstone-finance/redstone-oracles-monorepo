import { BlockchainServiceWithTransfer } from "@redstone-finance/multichain-kit";
import { RadixClient } from "./RadixClient";
import { RadixContractConnector } from "./RadixContractConnector";

export class RadixBlockchainService
  extends RadixContractConnector
  implements BlockchainServiceWithTransfer
{
  constructor(client: RadixClient) {
    super(client);
  }
}
