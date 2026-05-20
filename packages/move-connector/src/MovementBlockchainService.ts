import {
  BlockchainServiceWithTransfer,
  BlockchainServiceWithTxLookup,
} from "@redstone-finance/multichain-kit";
import { RedstoneCommon } from "@redstone-finance/utils";
import { MoveClient } from "./MoveClient";
import { MoveContractConnector } from "./MoveContractConnector";
import { MovementTxLookup } from "./MovementTxLookup";

export class MovementBlockchainService
  extends MoveContractConnector
  implements BlockchainServiceWithTransfer, BlockchainServiceWithTxLookup
{
  constructor(client: MoveClient, privateKey?: RedstoneCommon.PrivateKey) {
    super(client, privateKey);
  }

  get txLookup() {
    return new MovementTxLookup(this.client);
  }
}
