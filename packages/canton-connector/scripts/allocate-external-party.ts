import { RedstoneCommon } from "@redstone-finance/utils";
import { createPublicKey, sign } from "node:crypto";
import { z } from "zod";
import { makeEd25519PrivateKey } from "../src/utils/ed25519";
import { makeDefaultClient, readZrodelkoPrivateKeyHex } from "./utils";

const PUBLIC_KEY_FORMAT = "CRYPTO_KEY_FORMAT_DER_X509_SUBJECT_PUBLIC_KEY_INFO";
const PUBLIC_KEY_SPEC = "SIGNING_KEY_SPEC_EC_CURVE25519";
const SIGNATURE_FORMAT = "SIGNATURE_FORMAT_CONCAT";
const SIGNING_ALGORITHM = "SIGNING_ALGORITHM_SPEC_ED25519";

async function main() {
  const client = makeDefaultClient();
  const privateKey = makeEd25519PrivateKey(await readZrodelkoPrivateKeyHex());

  const exportedPublicKey = createPublicKey(privateKey).export({
    format: "der",
    type: "spki",
  }) as Buffer;

  const synchronizer = await client.getSynchronizerId();
  const partyHint = RedstoneCommon.getFromEnv("PARTY_HINT", z.string().default("zrodelko"));

  const generated = await client.generateExternalPartyTopology({
    synchronizer,
    partyHint,
    publicKey: {
      format: PUBLIC_KEY_FORMAT,
      keyData: exportedPublicKey.toString("base64"),
      keySpec: PUBLIC_KEY_SPEC,
    },
    localParticipantObservationOnly: false,
    otherConfirmingParticipantUids: [],
    confirmationThreshold: 0,
    observingParticipantUids: [],
  });

  const signature = sign(null, Buffer.from(generated.multiHash, "base64"), privateKey).toString(
    "base64"
  );

  const allocated = await client.allocateExternalParty({
    synchronizer,
    onboardingTransactions: (generated.topologyTransactions ?? []).map((transaction) => ({
      transaction,
    })),
    multiHashSignatures: [
      {
        format: SIGNATURE_FORMAT,
        signature,
        signedBy: generated.publicKeyFingerprint,
        signingAlgorithmSpec: SIGNING_ALGORITHM,
      },
    ],
    identityProviderId: "",
  });

  if (allocated.partyId !== generated.partyId) {
    throw new Error(
      `Party ID mismatch: allocated=${allocated.partyId}, generated=${generated.partyId}`
    );
  }

  console.log(
    JSON.stringify(
      {
        partyId: allocated.partyId,
        generatedPartyId: generated.partyId,
        publicKeyFingerprint: generated.publicKeyFingerprint,
        synchronizer,
      },
      null,
      2
    )
  );
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
