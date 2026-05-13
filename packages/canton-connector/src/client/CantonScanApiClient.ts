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

type HoldingsSummaryResponse = {
  summaries: { party_id: string; total_available_coin: string }[];
};

const HEADERS = { "Content-Type": "application/json" };
const MAX_RETRIES = 3;

export class CantonScanApiClient {
  private static logger = loggerFactory("canton-scan-api-client");

  Defs: (typeof AllDefs)["devnet"];
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
    this.migrationIdCache ??= this.findLatestMigrationId();

    return this.migrationIdCache;
  }

  private async findLatestMigrationId(): Promise<number> {
    const result = await this.api.requestWithProxy<DsoSequencersResponse>(`/v0/dso-sequencers`);
    const migrationIds = result.data.domainSequencers
      .flatMap((d) => d.sequencers)
      .map((s) => s.migrationId);

    if (migrationIds.length === 0) {
      throw new Error("No migration IDs found in DSO sequencers response");
    }

    return Math.max(...migrationIds);
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
