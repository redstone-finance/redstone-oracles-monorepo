import { RedstoneCommon } from "@redstone-finance/utils";
import axios from "axios";
import { sign } from "node:crypto";
import { z } from "zod";
import { CantonValidatorClient } from "../src";
import * as AllDefs from "../src/canton-defs.json";
import { ed25519PublicKeyHex, makeEd25519PrivateKey } from "../src/utils/ed25519";
import { makeDefaultClientWithValidator, readNetwork, readZrodelkoPrivateKeyHex } from "./utils";

async function getOrCreateSetupProposal(
  validatorClient: CantonValidatorClient,
  partyId: string
): Promise<string> {
  try {
    const { contract_id } = await validatorClient.setupProposal(partyId);
    console.log(`Created setup proposal: ${contract_id}`);

    return contract_id;
  } catch (e) {
    const axiosError = axios.isAxiosError(e)
      ? e
      : e instanceof AggregateError
        ? e.errors.find((err) => axios.isAxiosError(err))
        : undefined;

    if (axiosError?.response?.status !== 409) {
      console.error("setupProposal failed:", RedstoneCommon.stringifyError(e));

      throw e;
    }

    const proposals = await validatorClient.listSetupProposals();
    const active = proposals.find((p) => p.user_party_id === partyId);

    if (!active) {
      const existingPreapproval = await validatorClient.lookupTransferPreapproval(partyId);

      if (existingPreapproval) {
        console.log(
          `TransferPreapproval already active for ${partyId}: contract_id=${existingPreapproval}`
        );
        process.exit(0);
      }

      throw new Error(
        `No active setup proposal or TransferPreapproval found for ${partyId}. ` +
          `Active proposals: ${proposals.map((p) => `${p.contract_id} (party=${p.user_party_id})`).join(", ") || "none"}`
      );
    }

    console.log(`Using existing active setup proposal: ${active.contract_id}`);

    return active.contract_id;
  }
}

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

  const contractId = await getOrCreateSetupProposal(validatorClient, partyId);

  let transaction: string;
  let tx_hash: string;
  try {
    ({ transaction, tx_hash } = await validatorClient.prepareAccept(contractId, partyId));
  } catch (e) {
    console.error("prepareAccept failed:", RedstoneCommon.stringifyError(e));

    throw e;
  }

  const privateKeyHex = await readZrodelkoPrivateKeyHex();
  const privateKey = makeEd25519PrivateKey(privateKeyHex);
  const publicKeyHex = ed25519PublicKeyHex(privateKeyHex);

  const signedTxHash = sign(null, Buffer.from(tx_hash, "hex"), privateKey).toString("hex");

  let result: { update_id: string };
  try {
    result = await validatorClient.submitAccept(partyId, transaction, signedTxHash, publicKeyHex);
  } catch (e) {
    console.error("submitAccept failed:", RedstoneCommon.stringifyError(e));

    throw e;
  }

  console.log(JSON.stringify({ update_id: result.update_id, partyId }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
