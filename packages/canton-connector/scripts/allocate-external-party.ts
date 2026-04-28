import { getSSMParameterValue } from "@redstone-finance/internal-utils";
import { RedstoneCommon } from "@redstone-finance/utils";
import { createPrivateKey, createPublicKey, sign } from "node:crypto";
import { z } from "zod";
import { makeDefaultClient } from "./utils";

// PKCS#8 DER header for Ed25519 (RFC 8410)
const ED25519_PKCS8_DER_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const PUBLIC_KEY_FORMAT = "CRYPTO_KEY_FORMAT_DER_X509_SUBJECT_PUBLIC_KEY_INFO";
const PUBLIC_KEY_SPEC = "SIGNING_KEY_SPEC_EC_CURVE25519";
const SIGNATURE_FORMAT = "SIGNATURE_FORMAT_CONCAT";
const SIGNING_ALGORITHM = "SIGNING_ALGORITHM_SPEC_ED25519";

async function readPrivateKeyHex() {
  const ssmParamPath = RedstoneCommon.getFromEnv(
    "SSM_PARAM_PATH",
    z.string().default("/prod/canton/zrodelko/private-key")
  );
  const awsRegion = RedstoneCommon.getFromEnv("AWS_REGION", z.string().default("eu-west-1"));
  const privateKey = await getSSMParameterValue(ssmParamPath, awsRegion);

  if (!privateKey) {
    throw new Error(`Parameter ${ssmParamPath} not found in SSM`);
  }

  return normalizeHex(privateKey);
}

function normalizeHex(value: string) {
  const normalized = value.replace(/^0x/i, "");

  if (!/^[a-f0-9]{64}$/i.test(normalized)) {
    throw new Error("Ed25519 private key must be a 32-byte hex string");
  }

  return normalized.toLowerCase();
}

function makeEd25519PrivateKey(privateKeyHex: string) {
  const privateKeyPkcs8Der = Buffer.concat([
    ED25519_PKCS8_DER_PREFIX,
    Buffer.from(privateKeyHex, "hex"),
  ]);

  return createPrivateKey({ key: privateKeyPkcs8Der, format: "der", type: "pkcs8" });
}

async function main() {
  const client = makeDefaultClient();
  const privateKey = makeEd25519PrivateKey(await readPrivateKeyHex());

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
