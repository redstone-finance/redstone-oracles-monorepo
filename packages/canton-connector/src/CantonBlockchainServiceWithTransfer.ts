import { BlockchainServiceWithTransfer } from "@redstone-finance/multichain-kit";
import { loggerFactory } from "@redstone-finance/utils";
import { sign } from "node:crypto";
import { CantonBlockchainService } from "./CantonBlockchainService";
import { CantonClient } from "./client/CantonClient";
import { CantonTransferService } from "./client/CantonTransferService";
import { makeEd25519PrivateKey } from "./utils/ed25519";

const logger = loggerFactory("canton-transfer");

export class CantonBlockchainServiceWithTransfer
  extends CantonBlockchainService
  implements BlockchainServiceWithTransfer
{
  private readonly privateKey: ReturnType<typeof makeEd25519PrivateKey>;

  constructor(
    cantonClient: CantonClient,
    private readonly partyId: string,
    privateKeyHex: string,
    private readonly transferService: CantonTransferService
  ) {
    super(cantonClient);
    this.privateKey = makeEd25519PrivateKey(privateKeyHex);
  }

  getSignerAddress(): Promise<string> {
    return Promise.resolve(this.partyId);
  }

  async transfer(toAddress: string, amount: number) {
    logger.log(
      `token-standard transfer: sender=${this.partyId} receiver=${toAddress} amount=${amount}`
    );

    const { sdk, transferCommand, disclosedContracts } = await this.transferService.prepareTransfer(
      this.partyId,
      toAddress,
      amount
    );

    const preparedTx = sdk.ledger.prepare({
      partyId: this.partyId,
      commands: transferCommand,
      disclosedContracts,
    });

    const { response } = await preparedTx.toJSON();
    logger.log(`prepare ok, hash=${response.preparedTransactionHash}`);

    const hashBytes = Buffer.from(response.preparedTransactionHash, "base64");
    const signatureBase64 = sign(null, hashBytes, this.privateKey).toString("base64");

    const signedTx = sdk.ledger.fromSignature(response, signatureBase64);
    const result = await signedTx.execute({ partyId: this.partyId });

    logger.log(`execute ok, updateId=${result.updateId} offset=${result.completionOffset}`);
  }
}
