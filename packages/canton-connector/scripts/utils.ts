import { getSSMParameterValue } from "@redstone-finance/internal-utils";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  CantonClientBuilder,
  CantonNetwork,
  CantonNetworks,
  CantonValidatorClient,
  KeycloakTokenProvider,
  getCantonNodeConfig,
  makeKeycloakParams,
  networkToChainId,
} from "../src";

const TOKEN_PROVIDER_TYPE = z.enum(["keycloak", "file", "none"]);

export function readParticipantUrl() {
  return RedstoneCommon.getFromEnv("PARTICIPANT", z.url());
}

export function readNetwork(): CantonNetwork {
  return RedstoneCommon.getFromEnv("NETWORK", z.enum(CantonNetworks).default("devnet"));
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
    case "keycloak": {
      const tokenProvider = KeycloakTokenProvider.getInstance();

      return tokenProvider.getToken.bind(tokenProvider);
    }
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

export function makePartyId(partyName: string) {
  return `${partyName}::${readPartySuffix()}`;
}

export function makeDefaultClient() {
  return new CantonClientBuilder()
    .withChainId(networkToChainId(readNetwork()))
    .withTokenProvider(getTokenProvider())
    .withRpcUrl(getJsonApiUrl())
    .build();
}

export function makeWalletTokenProvider(): () => Promise<string> {
  const params = makeKeycloakParams();
  const tokenProvider = KeycloakTokenProvider.getInstance({
    ...params,
    clientId: getCantonNodeConfig(readNetwork()).walletClientId,
    username: params.walletUsername ?? params.username,
    password: params.walletPassword ?? params.password,
  });

  return () => tokenProvider.getToken();
}

export async function readZrodelkoPrivateKeyHex(): Promise<string> {
  const env = readNetwork() === "mainnet" ? "prod" : "dev";
  const ssmParamPath = RedstoneCommon.getFromEnv(
    "SSM_PARAM_PATH",
    z.string().default(`/${env}/canton/zrodelko/private-key`)
  );
  const awsRegion = RedstoneCommon.getFromEnv("AWS_REGION", z.string().default("eu-west-1"));
  const privateKey = await getSSMParameterValue(ssmParamPath, awsRegion);

  if (!privateKey) {
    throw new Error(`Parameter ${ssmParamPath} not found in SSM`);
  }

  const normalized = privateKey.replace(/^0x/i, "").toLowerCase();

  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error("Ed25519 private key must be a 32-byte hex string");
  }

  return normalized;
}

export function makeValidatorClient(): CantonValidatorClient {
  return new CantonValidatorClient(
    getCantonNodeConfig(readNetwork()).validatorApiUrl,
    makeWalletTokenProvider()
  );
}
