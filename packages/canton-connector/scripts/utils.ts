import { RedstoneCommon } from "@redstone-finance/utils";
import axios from "axios";
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { CantonNetwork, CantonNetworks } from "../src";

export function readParticipantUrl() {
  return RedstoneCommon.getFromEnv("PARTICIPANT", z.url());
}

export function readNetwork(): CantonNetwork {
  return RedstoneCommon.getFromEnv("NETWORK", z.enum(CantonNetworks).default("devnet"));
}

export function readPartySuffix() {
  return RedstoneCommon.getFromEnv("PARTY_SUFFIX");
}

export function getJsonApiUrl(participantUrl = readParticipantUrl()) {
  return `${participantUrl}/jsonapi`;
}

export async function fileTokenProvider(
  filePath = path.join(__dirname, "..", "daml", "token.txt")
) {
  return (await readFile(filePath, "utf-8")).trim();
}

export async function keycloakTokenProvider(opts?: {
  url: string;
  realm: string;
  clientId: string;
  username: string;
  password: string;
}) {
  const { url, realm, clientId, username, password } = opts ?? readKeycloakOpts();

  const { data } = await axios.post<{ access_token: string }>(
    `${url}/auth/realms/${realm}/protocol/openid-connect/token`,
    {
      grant_type: "password",
      client_id: clientId,
      username: username,
      password: password,
    },
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return data.access_token;
}

function readKeycloakOpts() {
  return {
    url: RedstoneCommon.getFromEnv("KEYCLOAK_URL", z.url()),
    realm: RedstoneCommon.getFromEnv("REALM"),
    clientId: RedstoneCommon.getFromEnv("CLIENT_ID"),
    username: RedstoneCommon.getFromEnv("KEYCLOAK_USERNAME"),
    password: RedstoneCommon.getFromEnv("KEYCLOAK_PASSWORD"),
  };
}
