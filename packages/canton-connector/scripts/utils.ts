import { getSSMParameterValue } from "@redstone-finance/internal-utils";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { z } from "zod";
import {
  CantonClient,
  CantonClientBuilder,
  CantonNetwork,
  CantonNetworks,
  CantonValidatorClient,
  KeycloakTokenProvider,
  makeKeycloakParams,
  networkToChainId,
  TokenProvider,
} from "../src";

export function readApiUrl() {
  return RedstoneCommon.getFromEnv("API", z.url());
}

export function readNetwork(): CantonNetwork {
  return RedstoneCommon.getFromEnv("NETWORK", z.enum(CantonNetworks).default("devnet"));
}

export function readPartySuffix() {
  return RedstoneCommon.getFromEnv("PARTY_SUFFIX");
}

export function readRpcUrls() {
  return RedstoneCommon.getFromEnv("RPC_URLS", z.array(z.url()).default([readApiUrl()]));
}

export function makePartyId(partyName: string) {
  return `${partyName}::${readPartySuffix()}`;
}

export function makeDefaultClient() {
  return makeDefaultClientWithValidator().client;
}

export function makeDefaultClientWithValidator(mustValidatorClientBeDefined: true): {
  client: CantonClient;
  validatorClient: CantonValidatorClient;
};
export function makeDefaultClientWithValidator(mustValidatorClientBeDefined?: false): {
  client: CantonClient;
  validatorClient: CantonValidatorClient | undefined;
};
export function makeDefaultClientWithValidator(mustValidatorClientBeDefined = false) {
  const builder = new CantonClientBuilder()
    .withChainId(networkToChainId(readNetwork()))
    .withDefaultAuth()
    .withRpcUrls(readRpcUrls())
    .withQuarantineEnabled();

  const validatorClient = builder.buildValidatorClient();

  if (mustValidatorClientBeDefined && !RedstoneCommon.isDefined(validatorClient)) {
    throw new Error("Validator Client is expected to be defined but is not");
  }

  return { client: builder.build(), validatorClient };
}

export function makeWalletTokenProvider(): TokenProvider {
  const params = makeKeycloakParams();
  const tokenProvider = KeycloakTokenProvider.getInstance({
    ...params,
    clientId: params.walletClientId ?? params.clientId,
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
