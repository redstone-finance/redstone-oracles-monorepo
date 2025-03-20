import {
  PrivateKey,
  TransactionBuilderIntentSignaturesStep,
} from "@radixdlt/radix-engine-toolkit";

export interface RadixPrivateKey {
  scheme: "secp256k1" | "ed25519";
  value: string;
}

export class RadixSigner {
  private readonly notarySigner: PrivateKey;
  private readonly additionalSigners?: PrivateKey[];
  constructor(
    notaryKey: RadixPrivateKey,
    additionalSignerKeys?: RadixPrivateKey[]
  ) {
    this.notarySigner = RadixSigner.makeSigner(notaryKey);
    this.additionalSigners = additionalSignerKeys?.map(RadixSigner.makeSigner);
  }

  private static makeSigner(privateKey: RadixPrivateKey) {
    switch (privateKey.scheme) {
      case "ed25519":
        return new PrivateKey.Ed25519(privateKey.value);
      case "secp256k1":
        return new PrivateKey.Secp256k1(privateKey.value);
    }
  }

  public sign(signatureStep: TransactionBuilderIntentSignaturesStep) {
    for (const signer of this.additionalSigners ?? []) {
      signatureStep = signatureStep.sign(signer);
    }

    return signatureStep.notarize(this.notarySigner);
  }

  public publicKeyHex() {
    return this.notarySigner.publicKeyHex();
  }

  public publicKey() {
    return this.notarySigner.publicKey();
  }

  public getNotarySigner() {
    return this.notarySigner;
  }
}
