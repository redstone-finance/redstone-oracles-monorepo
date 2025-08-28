import Str from "@ledgerhq/hw-app-str";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid-singleton";
import { Keypair, StrKey } from "@stellar/stellar-sdk";

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
}

export async function makeStellar(accountId: number) {
  const transport = await TransportNodeHid.create();
  const str = new Str(transport);

  return new StellarLedgerSigner(str, accountId);
}
