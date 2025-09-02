import Str from "@ledgerhq/hw-app-str";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid-singleton";
import { Keypair, StrKey, Transaction } from "@stellar/stellar-sdk";

const getDerivationPath = (accountId: number) => `44'/148'/${accountId}`;

export class StellarLedgerSigner {
  constructor(
    private readonly stellar: Str,
    private readonly accountId: number
  ) {}

  async getPublicKey() {
    const result = await this.stellar.getPublicKey(
      getDerivationPath(this.accountId)
    );
    const stellarPublicKeyString = StrKey.encodeEd25519PublicKey(
      result.rawPublicKey
    );

    const keypair = Keypair.fromPublicKey(stellarPublicKeyString);

    return { stellarPublicKeyString, keypair };
  }

  async singAndAddSignature(tx: Transaction) {
    const signature = await this.sign(tx.hash());

    const publicKey = (await this.getPublicKey()).stellarPublicKeyString;

    tx.addSignature(publicKey, signature.toString("base64"));
  }

  async sign(hash: Buffer) {
    const signature = (
      await this.stellar.signHash(getDerivationPath(this.accountId), hash)
    ).signature;

    return signature;
  }

  async publicKey() {
    return (await this.getPublicKey()).stellarPublicKeyString;
  }
}

export async function makeStellar(accountId: number) {
  const transport = await TransportNodeHid.create();
  const str = new Str(transport);

  return new StellarLedgerSigner(str, accountId);
}
