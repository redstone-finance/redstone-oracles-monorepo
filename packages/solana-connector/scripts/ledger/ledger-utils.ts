import Solana from "@ledgerhq/hw-app-solana";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { hexlify } from "ethers/lib/utils";

const getDerivationPath = (accountId: number) => `44'/501'/${accountId}`;

export class SolanaLedgerSigner {
  constructor(
    private readonly solana: Solana,
    private readonly accountId: number
  ) {}

  async signTransaction(transaction: VersionedTransaction) {
    console.log(`Serialized transaction, check with \`wtf\`: ${hexlify(transaction.serialize())}`);
    const serializedMessage = transaction.message.serialize();

    const result = await this.solana.signTransaction(
      getDerivationPath(this.accountId),
      Buffer.from(serializedMessage)
    );

    transaction.addSignature((await this.getPublicKey()).ed, result.signature);
  }

  async getPublicKey() {
    const result = await this.solana.getAddress(getDerivationPath(this.accountId));
    const edPublicKey = new PublicKey(result.address);

    return {
      publicKey: hexlify(result.address),
      address: edPublicKey.toBase58(),
      ed: edPublicKey,
    };
  }
}

export async function makeSolana(accountId: number) {
  const transport = await TransportNodeHid.create();
  const solana = new Solana(transport);

  return new SolanaLedgerSigner(solana, accountId);
}
