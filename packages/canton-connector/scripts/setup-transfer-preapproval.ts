import { sign } from "node:crypto";
import * as AllDefs from "../src/canton-defs.json";
import { ed25519PublicKeyHex, makeEd25519PrivateKey } from "../src/utils/ed25519";
import { makeDefaultClientWithValidator, readNetwork, readZrodelkoPrivateKeyHex } from "./utils";

/**
 * Sets up a TransferPreapproval for zrodelko (external party) by signing the setup proposal
 * with zrodelko's Ed25519 private key. This allows zrodelko to receive incoming CC transfers.
 */
async function main() {
  const network = readNetwork();
  const { zrodelkoPartyId } = AllDefs[network].node as { zrodelkoPartyId: string };
  const { validatorClient } = makeDefaultClientWithValidator(true);

  const { contract_id } = await validatorClient.setupProposal(zrodelkoPartyId);
  console.log(`Created setup proposal: ${contract_id}`);

  const { transaction, tx_hash } = await validatorClient.prepareAccept(
    contract_id,
    zrodelkoPartyId
  );

  const privateKeyHex = await readZrodelkoPrivateKeyHex();
  const privateKey = makeEd25519PrivateKey(privateKeyHex);
  const publicKeyHex = ed25519PublicKeyHex(privateKeyHex);

  const signedTxHash = sign(null, Buffer.from(tx_hash, "hex"), privateKey).toString("hex");

  const result = await validatorClient.submitAccept(
    zrodelkoPartyId,
    transaction,
    signedTxHash,
    publicKeyHex
  );

  console.log(JSON.stringify({ update_id: result.update_id, zrodelkoPartyId }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
