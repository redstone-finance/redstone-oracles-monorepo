import { BlockchainServiceWithTransfer } from "@redstone-finance/multichain-kit";
import { RedstoneCommon } from "@redstone-finance/utils";
import { sign } from "node:crypto";
import { CantonBlockchainService } from "./CantonBlockchainService";
import { CantonClient } from "./client/CantonClient";
import { CantonValidatorClient } from "./client/CantonValidatorClient";
import { ccToNormalized, normalizedToCC } from "./utils/conversions";
import { ed25519PublicKeyHex, makeEd25519PrivateKey } from "./utils/ed25519";

const SEND_EXPIRY_MS = RedstoneCommon.minToMs(5);

export class CantonBlockchainServiceWithTransfer
  extends CantonBlockchainService
  implements BlockchainServiceWithTransfer
{
  private readonly privateKey: ReturnType<typeof makeEd25519PrivateKey>;
  private readonly publicKeyHex: string;

  constructor(
    cantonClient: CantonClient,
    private readonly validatorClient: CantonValidatorClient,
    private readonly partyId: string,
    privateKeyHex: string
  ) {
    super(cantonClient);
    this.privateKey = makeEd25519PrivateKey(privateKeyHex);
    this.publicKeyHex = ed25519PublicKeyHex(privateKeyHex);
  }

  getSignerAddress(): Promise<string> {
    return Promise.resolve(this.partyId);
  }

  async transfer(toAddress: string, amount: number) {
    const nonce = Date.now();
    const expiresAt = new Date(Date.now() + SEND_EXPIRY_MS);
    const ccAmount = normalizedToCC(amount);

    const { transaction, tx_hash } = await this.validatorClient.prepareSend(
      this.partyId,
      toAddress,
      ccAmount,
      expiresAt,
      nonce
    );

    const signedTxHash = sign(null, Buffer.from(tx_hash, "hex"), this.privateKey).toString("hex");

    await this.validatorClient.submitSend(
      this.partyId,
      transaction,
      signedTxHash,
      this.publicKeyHex
    );
  }

  override async getNormalizedBalance(address: string): Promise<bigint> {
    const ccBalance = await this.cantonClient.getAmuletBalance(address);

    return ccToNormalized(ccBalance);
  }
}
