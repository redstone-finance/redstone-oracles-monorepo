import {
  NotarizedTransaction,
  PrivateKey,
  PublicKey,
  TransactionBuilderIntentSignaturesStep,
} from "@radixdlt/radix-engine-toolkit";
import { RedstoneCommon } from "@redstone-finance/utils";

export interface IRadixSigner {
  asyncSign: (
    step: TransactionBuilderIntentSignaturesStep
  ) => Promise<NotarizedTransaction>;
  publicKey: () => Promise<PublicKey>;
  publicKeyHex: () => Promise<string>;
  getNotarySigner: () => PrivateKey | undefined;
}

export class RadixSigner implements IRadixSigner {
  private readonly notarySigner: PrivateKey;
  private readonly additionalSigners?: PrivateKey[];
  constructor(
    notaryKey: RedstoneCommon.PrivateKey,
    additionalSignerKeys?: RedstoneCommon.PrivateKey[]
  ) {
    this.notarySigner = RadixSigner.makeSigner(notaryKey);
    this.additionalSigners = additionalSignerKeys?.map(RadixSigner.makeSigner);
  }

  public async asyncSign(
    signatureStep: TransactionBuilderIntentSignaturesStep
  ) {
    for (const signer of this.additionalSigners ?? []) {
      signatureStep = signatureStep.sign(signer);
    }

    return await signatureStep.notarize(this.notarySigner);
  }

  private static makeSigner(privateKey: RedstoneCommon.PrivateKey) {
    switch (privateKey.scheme) {
      case "ed25519":
        return new PrivateKey.Ed25519(privateKey.value);
      case "secp256k1":
        return new PrivateKey.Secp256k1(privateKey.value);
    }
  }
  public publicKeyHex() {
    return Promise.resolve(this.notarySigner.publicKeyHex());
  }

  public publicKey() {
    return Promise.resolve(this.notarySigner.publicKey());
  }

  public getNotarySigner() {
    return this.notarySigner;
  }
}
