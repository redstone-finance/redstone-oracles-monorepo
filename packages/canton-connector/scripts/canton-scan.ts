/**
 * Shared Scan access for the canton-connector scripts.
 */

import { RedstoneCommon } from "@redstone-finance/utils";
import axios from "axios";
import "dotenv/config";
import {
  API_TYPE_SCAN,
  API_TYPE_SCAN_PROXY,
  CantonApi,
  KeycloakTokenProvider,
  TokenProvider,
} from "../src";
import { ScanCantonApi } from "../src/client/CantonScanApiClient";
import { makeScriptKeycloakOptions, readRpcUrls } from "./utils";

function makeTokenProvider(clientId: string): TokenProvider {
  const params = makeScriptKeycloakOptions();
  const isWallet = params.walletClientId === clientId;

  const provider = KeycloakTokenProvider.getInstance({
    ...params,
    clientId,
    username: (isWallet ? params.walletUsername : params.username) ?? params.username,
    password: (isWallet ? params.walletPassword : params.password) ?? params.password,
    getTotp: (isWallet ? params.walletGetTotp : params.getTotp) ?? params.getTotp,
  });

  return () => provider.getToken();
}

export function makeScanApi() {
  const parsed = readRpcUrls().map((url) => CantonApi.parseUrl(url));
  const scan = parsed.find((api) => api.type === API_TYPE_SCAN);
  const proxy = parsed.find((api) => api.type === API_TYPE_SCAN_PROXY);

  if (!scan) {
    throw new Error(`No ${API_TYPE_SCAN} URL in RPC_URLS`);
  }
  if (!proxy?.clientId) {
    throw new Error(`No ${API_TYPE_SCAN_PROXY} URL with a clientId in RPC_URLS`);
  }

  return {
    api: new ScanCantonApi(proxy.baseUrl, scan.baseUrl, makeTokenProvider(proxy.clientId)),
    scanBaseUrl: scan.baseUrl,
    proxyBaseUrl: proxy.baseUrl,
  };
}

export function describeError(error: unknown): { status?: number; message: string } {
  const inner: unknown =
    error instanceof AggregateError
      ? (error.errors.find((e) => axios.isAxiosError(e)) ?? error.errors[0])
      : error;

  if (axios.isAxiosError(inner)) {
    return {
      status: inner.response?.status,
      message: JSON.stringify(inner.response?.data ?? inner.message).slice(0, 400),
    };
  }

  return { message: RedstoneCommon.stringifyError(inner).slice(0, 400) };
}

export function upstreamStatus(message: string): number | undefined {
  const match = /"status"\s*:\s*(\d{3})/.exec(message);

  return match ? Number(match[1]) : undefined;
}

export async function latestMigrationId(api: ScanCantonApi) {
  const { data } = await api.requestWithProxy<{
    domainSequencers: { sequencers: { migrationId: number }[] }[];
  }>("/v0/dso-sequencers");

  const ids = data.domainSequencers.flatMap((d) => d.sequencers).map((s) => s.migrationId);

  if (ids.length === 0) {
    throw new Error("No migration IDs in /v0/dso-sequencers response");
  }

  return Math.max(...ids);
}
