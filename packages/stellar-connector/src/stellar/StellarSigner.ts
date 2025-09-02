import { Transaction } from "@stellar/stellar-sdk";

export interface Signer {
  sign(txHash: Buffer): Buffer | Promise<Buffer>;
  publicKey(): string | Promise<string>;
}

export class StellarSigner {
  constructor(private readonly signer: Signer) {}

  async sign(tx: Transaction) {
    const hash = tx.hash();
    const signature = await this.signer.sign(hash);

    const pk = await this.publicKey();

    tx.addSignature(pk, signature.toString("base64"));
  }

  async publicKey() {
    return await this.signer.publicKey();
  }
}
