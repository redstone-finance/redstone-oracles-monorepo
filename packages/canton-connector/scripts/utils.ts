import { getSSMParameterValue } from "@redstone-finance/internal-utils";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { execSync } from "node:child_process";
import { z } from "zod";
import {
  CantonClient,
  CantonClientBuilder,
  CantonNetwork,
  CantonNetworks,
  CantonValidatorClient,
  KeycloakTokenProvider,
  KeycloakTokenProviderOptions,
  makeKeycloakParams,
  networkToChainId,
  TokenProvider,
} from "../src";

function promptTotpSync(username: string): string {
  process.stderr.write(`\n[MFA] Enter TOTP code for ${username}: `);

  return execSync("read -r code && echo $code", { stdio: ["inherit", "pipe", "inherit"] })
    .toString()
    .trim();
}

function makeScriptKeycloakOptions(): KeycloakTokenProviderOptions {
  const params = makeKeycloakParams();
  const walletUsername = params.walletUsername ?? params.username;

  return {
    ...params,
    getTotp: () => Promise.resolve(promptTotpSync(params.username)),
    walletGetTotp: () => Promise.resolve(promptTotpSync(walletUsername)),
  };
}

export function readApiUrl() {
  return RedstoneCommon.getFromEnv("API", z.url());
}

export function readNetwork(): CantonNetwork {
  return RedstoneCommon.getFromEnv("NETWORK", z.enum(CantonNetworks).default("devnet"));
}

export function readPartySuffix() {
  return RedstoneCommon.getFromEnv("CANTON_PARTY_SUFFIX");
}

export function readRpcUrls() {
  return RedstoneCommon.getFromEnv(
    "RPC_URLS",
    z.array(RedstoneCommon.urlOrHostSchema).default([readApiUrl()])
  );
}

export function makePartyId(partyName: string) {
  return `${partyName}::${readPartySuffix()}`;
}

export function makeDefaultClient() {
  return makeDefaultClientWithValidator(false, makeKeycloakParams()).client;
}

export function makeDefaultScriptClient() {
  return makeDefaultClientWithValidator().client;
}

export function makeDefaultClientWithValidator(
  mustValidatorClientBeDefined: true,
  keycloakOptions?: KeycloakTokenProviderOptions | string
): {
  client: CantonClient;
  validatorClient: CantonValidatorClient;
};
export function makeDefaultClientWithValidator(
  mustValidatorClientBeDefined?: false,
  keycloakOptions?: KeycloakTokenProviderOptions | string
): {
  client: CantonClient;
  validatorClient?: CantonValidatorClient;
};
export function makeDefaultClientWithValidator(
  mustValidatorClientBeDefined = false,
  keycloakOptions: KeycloakTokenProviderOptions | string = makeScriptKeycloakOptions()
) {
  const builder = new CantonClientBuilder()
    .withChainId(networkToChainId(readNetwork()))
    .withDefaultAuth(keycloakOptions)
    .withRpcUrls(readRpcUrls())
    .withQuarantineEnabled()
    .withTransferService();

  const validatorClient = builder.buildValidatorClient();

  if (mustValidatorClientBeDefined && !RedstoneCommon.isDefined(validatorClient)) {
    throw new Error("Validator Client is expected to be defined but is not");
  }

  return { client: builder.build(), validatorClient };
}

export function makeWalletTokenProvider(): TokenProvider {
  const params = makeScriptKeycloakOptions();
  const tokenProvider = KeycloakTokenProvider.getInstance({
    ...params,
    getTotp: params.walletGetTotp ?? params.getTotp,
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
