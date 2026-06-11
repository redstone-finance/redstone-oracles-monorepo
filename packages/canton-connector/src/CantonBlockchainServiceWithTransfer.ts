import { BlockchainServiceWithTransfer } from "@redstone-finance/multichain-kit";
import { CantonBlockchainService } from "./CantonBlockchainService";
import { CantonClient } from "./client/CantonClient";
import { TransferSigner } from "./client/CantonTransferService";
import { assertValidPartyId } from "./utils/utils";

export class CantonBlockchainServiceWithTransfer
  extends CantonBlockchainService
  implements BlockchainServiceWithTransfer
{
  private readonly signer: TransferSigner;

  constructor(cantonClient: CantonClient, signer: TransferSigner) {
    super(cantonClient);

    assertValidPartyId(signer.partyId);
    this.signer = signer;
  }

  getSignerAddress() {
    return Promise.resolve(this.signer.partyId);
  }

  transfer(toAddress: string, amount: number) {
    return this.cantonClient.transfer(toAddress, amount, this.signer);
  }
}
