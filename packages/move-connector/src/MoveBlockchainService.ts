import {
  BlockchainServiceWithTransfer,
  BlockchainServiceWithTxLookup,
} from "@redstone-finance/multichain-kit";
import { RedstoneCommon } from "@redstone-finance/utils";
import { MoveClient } from "./MoveClient";
import { MoveContractConnector } from "./MoveContractConnector";
import { MoveTxLookup } from "./MoveTxLookup";

export class MoveBlockchainService
  extends MoveContractConnector
  implements BlockchainServiceWithTransfer, BlockchainServiceWithTxLookup
{
  constructor(client: MoveClient, privateKey?: RedstoneCommon.PrivateKey) {
    super(client, privateKey);
  }

  get txLookup() {
    return new MoveTxLookup(this.client);
  }
}
