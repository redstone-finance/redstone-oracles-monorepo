import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import * as AllDefs from "../canton-defs.json";
import { CantonNetwork } from "../CantonNetwork";
import { CantonApi, TokenProvider } from "./CantonApi";

type TrafficStatusResponse = {
  traffic_status: {
    actual: {
      total_consumed: number;
      total_limit: number;
    };
    target: {
      total_purchased: number;
    };
  };
};

type AcsSnapshotTimestampResponse = {
  record_time: string;
};

type DsoSequencersResponse = {
  domainSequencers: { sequencers: { migrationId: number }[] }[];
};

type LastMigrationResponse = {
  migration_id: number;
};

type HoldingsSummaryResponse = {
  summaries: { party_id: string; total_available_coin: string }[];
};

const HEADERS = { "Content-Type": "application/json" };
const MAX_RETRIES = 3;

export class CantonScanApiClient {
  private static logger = loggerFactory("canton-scan-api-client");

  Defs: (typeof AllDefs)[CantonNetwork];
  private migrationIdCache?: Promise<number>;

  constructor(
    private readonly api: ScanCantonApi,
    readonly network: CantonNetwork = "devnet"
  ) {
    this.Defs = AllDefs[network];
  }

  async getAmuletHoldingsSummary(partyId: string) {
    const before = new Date().toISOString();

    const migrationId = await this.getCachedMigrationId();

    const snapshotPath = `/v0/state/acs/snapshot-timestamp?before=${encodeURIComponent(before)}&migration_id=${migrationId}`;
    const snapshot = await this.api.requestWithProxy<AcsSnapshotTimestampResponse>(snapshotPath);

    const result = await this.api.requestWithProxy<HoldingsSummaryResponse>(
      `/v0/holdings/summary`,
      {
        method: "POST",
        body: JSON.stringify({
          migration_id: migrationId,
          record_time: snapshot.data.record_time,
          owner_party_ids: [partyId],
        }),
      }
    );

    return result.data.summaries.find((s) => s.party_id === partyId);
  }

  private getCachedMigrationId(): Promise<number> {
    this.migrationIdCache ??= findLatestMigrationId(this.api);

    return this.migrationIdCache;
  }

  async getTrafficStatus() {
    const nodeDefs = this.Defs.node;

    const result = await this.api.requestWithProxy<TrafficStatusResponse>(
      `/v0/domains/${nodeDefs.globalDomain}/members/PAR::${nodeDefs.participantPartyId}/traffic-status`
    );

    CantonScanApiClient.logger.info("Traffic status response", { ...result.data });

    return result.data;
  }
}

export class ScanCantonApi extends CantonApi {
  constructor(
    readonly scanApiProxyUrl: string,
    private readonly scanApiUrl: string,
    tokenProvider?: TokenProvider
  ) {
    super(scanApiProxyUrl, tokenProvider);
  }

  async requestWithProxy<T>(
    path: string,
    options: { method: "GET" } | { method: "POST"; body: string } = { method: "GET" }
  ): Promise<{ data: T }> {
    const token = await this.tokenProvider?.();
    const authHeader = token ? { Authorization: `Bearer ${token}` } : undefined;
    const url = `${this.scanApiUrl}${path}`;

    return await RedstoneCommon.axiosPostWithRetries<T>(
      this.baseUrl,
      {
        method: options.method,
        url,
        ...(options.method === "POST" ? { headers: HEADERS, body: options.body } : {}),
      },
      {
        maxRetries: MAX_RETRIES,
        headers: { ...HEADERS, ...authHeader },
      }
    );
  }
}

// Since Splice 0.9.4 the migration id is frozen and sequencers addressed by a synchronizer serial
// report migrationId=-1, so fall back to /v0/migrations/last when no sequencer carries a real id.
export async function findLatestMigrationId(api: ScanCantonApi): Promise<number> {
  const result = await api.requestWithProxy<DsoSequencersResponse>(`/v0/dso-sequencers`);
  const migrationIds = result.data.domainSequencers
    .flatMap((d) => d.sequencers)
    .map((s) => s.migrationId)
    .filter((id) => id >= 0);

  if (migrationIds.length > 0) {
    return Math.max(...migrationIds);
  }

  const lastMigration = await api.requestWithProxy<LastMigrationResponse>(`/v0/migrations/last`);

  return lastMigration.data.migration_id;
}
