import Aptos from "@ledgerhq/hw-app-aptos";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import {
  NetworkId,
  PublicKey,
  RadixEngineToolkit,
  Signature,
  SignatureWithPublicKey,
  TransactionBuilderIntentSignaturesStep,
} from "@radixdlt/radix-engine-toolkit";
import { hexlify } from "ethers/lib/utils";
import { IRadixSigner } from "../../src";

export class LedgerSigner implements IRadixSigner {
  constructor(
    private readonly aptos: Aptos,
    private readonly accountId: number,
    private readonly networkId = NetworkId.Stokenet
  ) {}

  async asyncSign(step: TransactionBuilderIntentSignaturesStep) {
    return await step.notarizeAsync(this.signIntent.bind(this));
  }

  async signIntentToSignatureWithKey(hashIntent: Uint8Array) {
    const sig = await this.signHash(hashIntent);
    return new SignatureWithPublicKey.Ed25519(sig, (await this.publicKey()).bytes);
  }

  async signIntent(hashIntent: Uint8Array) {
    const sig = await this.signHash(hashIntent);
    return new Signature.Ed25519(sig);
  }

  async signHash(hashIntent: Uint8Array) {
    return new Uint8Array((await signHash(this.aptos, hashIntent, this.accountId)).signature);
  }

  async publicKey() {
    const pk = await getPublicKey(this.aptos, this.accountId, this.networkId);
    return pk.ed;
  }

  async publicKeyHex() {
    const pk = await getPublicKey(this.aptos, this.accountId, this.networkId);
    return pk.ed.hexString();
  }

  getNotarySigner() {
    return undefined;
  }

  static async makeLedgerSigner(accountId: number, networkId = NetworkId.Stokenet) {
    return new LedgerSigner(await makeAptosLedger(), accountId, networkId);
  }
}

export type AptosLedger = Aptos;

/// Creates connection to ledger device. Device should be unlocked and aptos app should be open.
export async function makeAptosLedger() {
  const transport = await TransportNodeHid.create();

  const aptos = new Aptos(transport);
  console.log(await aptos.getVersion());

  return aptos;
}

const getDerivationPath = (accountId: number) => `m/44'/637'/${accountId}'/0'/0'`;

/// returns public key of the ledger account
export const getPublicKey = async (
  aptos: AptosLedger,
  accountId: number,
  networkId = NetworkId.Stokenet
) => {
  const result = await aptos.getAddress(getDerivationPath(accountId));

  const pk = new PublicKey.Ed25519(new Uint8Array(result.publicKey));

  return {
    publicKey: hexlify(result.publicKey),
    address: await RadixEngineToolkit.Derive.virtualAccountAddressFromPublicKey(pk, networkId),
    ed: pk,
  };
};

export async function signHash(aptos: Aptos, input: Uint8Array, accountId: number) {
  return await aptos.signTransaction(getDerivationPath(accountId), Buffer.from(input));
}
