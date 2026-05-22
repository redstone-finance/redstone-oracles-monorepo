import { ACCOUNT_ID } from "../consts";
import { deserializeTx } from "./deserialize-tx";
import { makeStellar } from "./ledger-utils";

export async function sign(envelopeRaw: string) {
  const stellar = await makeStellar(ACCOUNT_ID);
  const publicKey = await stellar.publicKey();
  const tx = await deserializeTx(envelopeRaw);

  const signature = await stellar.sign(tx.hash());

  console.log({
    signature: signature.toString("base64"),
    publicKey,
  });
}

const envelopeArg = process.argv[2];

if (!envelopeArg) {
  throw new Error("Usage: yarn sign-tx <envelope-hex>");
}

void sign(envelopeArg);
