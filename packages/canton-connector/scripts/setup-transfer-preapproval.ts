import { RedstoneCommon } from "@redstone-finance/utils";
import { sign } from "node:crypto";
import { z } from "zod";
import * as AllDefs from "../src/canton-defs.json";
import { ed25519PublicKeyHex, makeEd25519PrivateKey } from "../src/utils/ed25519";
import { makeDefaultClientWithValidator, readNetwork, readZrodelkoPrivateKeyHex } from "./utils";

/**
 * Sets up a TransferPreapproval for an external party by signing the setup proposal
 * with the party's Ed25519 private key. This allows the party to receive incoming CC transfers.
 *
 * PARTY_ID env var overrides the default zrodelko party ID from canton-defs.json.
 * SSM_PARAM_PATH env var overrides the default SSM path for the private key.
 */
async function main() {
  const network = readNetwork();
  const { zrodelkoPartyId } = AllDefs[network].node as { zrodelkoPartyId: string };
  const partyId = RedstoneCommon.getFromEnv("PARTY_ID", z.string().default(zrodelkoPartyId));
  const { validatorClient } = makeDefaultClientWithValidator(true);

  const { contract_id } = await validatorClient.setupProposal(partyId);
  console.log(`Created setup proposal: ${contract_id}`);

  const { transaction, tx_hash } = await validatorClient.prepareAccept(contract_id, partyId);

  const privateKeyHex = await readZrodelkoPrivateKeyHex();
  const privateKey = makeEd25519PrivateKey(privateKeyHex);
  const publicKeyHex = ed25519PublicKeyHex(privateKeyHex);

  const signedTxHash = sign(null, Buffer.from(tx_hash, "hex"), privateKey).toString("hex");

  const result = await validatorClient.submitAccept(
    partyId,
    transaction,
    signedTxHash,
    publicKeyHex
  );

  console.log(JSON.stringify({ update_id: result.update_id, partyId }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
