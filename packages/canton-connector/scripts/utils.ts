import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { CantonNetwork, CantonNetworks, keycloakTokenProvider } from "../src";

const TOKEN_PROVIDER_TYPE = z.enum(["keycloak", "file", "none"]);

export function readParticipantUrl() {
  return RedstoneCommon.getFromEnv("PARTICIPANT", z.url());
}

export function readNetwork(): CantonNetwork {
  return RedstoneCommon.getFromEnv("NETWORK", z.enum(CantonNetworks).default("devnet"));
}

export function readUserId() {
  return RedstoneCommon.getFromEnv("USER_ID", z.string().optional());
}

export function readPartySuffix() {
  return RedstoneCommon.getFromEnv("PARTY_SUFFIX");
}

export function readApiPath() {
  return RedstoneCommon.getFromEnv("API_PATH", z.string().default("/jsonapi"));
}

export function getJsonApiUrl(participantUrl = readParticipantUrl(), path = readApiPath()) {
  return `${participantUrl}${path}`;
}

export function readProviderType() {
  return RedstoneCommon.getFromEnv("TOKEN_PROVIDER_TYPE", TOKEN_PROVIDER_TYPE.default("keycloak"));
}

export function getTokenProvider() {
  const providerType = readProviderType();

  switch (providerType) {
    case "keycloak":
      return () => keycloakTokenProvider();
    case "file":
      return () => fileTokenProvider();
    case "none":
      return undefined;
  }
}

export async function fileTokenProvider(
  filePath = path.join(__dirname, "..", "daml", "token.txt")
) {
  return (await readFile(filePath, "utf-8")).trim();
}
