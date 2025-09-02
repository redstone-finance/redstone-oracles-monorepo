import { Transaction, xdr } from "@stellar/stellar-sdk";
import { makeServer } from "../utils";

export async function deserializeTx(envelopeRaw: string) {
  const server = makeServer();
  const envelope = xdr.TransactionEnvelope.fromXDR(envelopeRaw, "hex");

  return new Transaction(envelope, (await server.getNetwork()).passphrase);
}
