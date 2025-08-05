import {
  AccountAddress,
  AccountAuthenticatorEd25519,
  AnyRawTransaction,
  Ed25519PublicKey,
  Ed25519Signature,
  generateSigningMessageForTransaction,
} from "@aptos-labs/ts-sdk";
import Aptos from "@ledgerhq/hw-app-aptos";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { hexlify } from "ethers/lib/utils";

export type AptosLedger = Aptos;

/// Creates connection to ledger device. Device should be unlocked and aptos app should be open.
export async function makeAptosLedger() {
  const transport = await TransportNodeHid.create();

  const aptos = new Aptos(transport);
  console.log(await aptos.getVersion());

  return aptos;
}

export async function makeAptosAccountAddress(
  aptosLedger: AptosLedger,
  accountId = 0
) {
  const data = await getLedgerData(aptosLedger, accountId);

  return AccountAddress.from(data.address);
}

const getDerivationPath = (accountId: number) =>
  `m/44'/637'/${accountId}'/0'/0'`;

/// returns public key of the ledger account
export const getLedgerData = async (aptos: AptosLedger, accountId: number) => {
  const result = await aptos.getAddress(getDerivationPath(accountId));

  return {
    publicKey: hexlify(result.publicKey),
    address: hexlify(result.address),
    ed: new Ed25519PublicKey(result.publicKey),
  };
};

/// Signs tx as a ledger account. Returns authenticator to be used while submitting tx to the network.
export const signTx = async (
  aptos: AptosLedger,
  tx: AnyRawTransaction,
  accountId: number
) => {
  const msg = generateSigningMessageForTransaction(tx);
  const signed = await aptos.signTransaction(
    getDerivationPath(accountId),
    Buffer.from(msg)
  );

  const signature = new Ed25519Signature(signed.signature);
  const data = await getLedgerData(aptos, accountId);

  return new AccountAuthenticatorEd25519(data.ed, signature);
};
