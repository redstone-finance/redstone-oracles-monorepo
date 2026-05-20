import {
  BlockchainServiceWithTransfer,
  BlockchainServiceWithTxLookup,
} from "@redstone-finance/multichain-kit";
import { RedstoneCommon } from "@redstone-finance/utils";
import { AptosTxLookup } from "./AptosTxLookup";
import { MoveClient } from "./MoveClient";
import { MoveContractConnector } from "./MoveContractConnector";

export class AptosBlockchainService
  extends MoveContractConnector
  implements BlockchainServiceWithTransfer, BlockchainServiceWithTxLookup
{
  constructor(client: MoveClient, privateKey?: RedstoneCommon.PrivateKey) {
    super(client, privateKey);
  }

  get txLookup() {
    return new AptosTxLookup(this.client);
  }
}
