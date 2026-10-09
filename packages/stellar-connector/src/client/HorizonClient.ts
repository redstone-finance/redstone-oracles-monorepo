import { RedstoneCommon } from "@redstone-finance/utils";
import { Horizon } from "@stellar/stellar-sdk";
import { LEDGER_TIME_MS } from "../stellar/StellarConstants";

export const HORIZON_MAX_PAGE_LIMIT = 200;

export type HorizonHistoryRecord = Horizon.HorizonApi.BaseResponse & {
  created_at: string;
  paging_token: string;
};

export interface HorizonHistoryQuery {
  accountId: string;
  sinceMs: number;
  afterCursor?: string;
}

type HorizonHistoryCallBuilder<T extends HorizonHistoryRecord> = {
  cursor(cursor: string): HorizonHistoryCallBuilder<T>;
  order(dir: "asc" | "desc"): HorizonHistoryCallBuilder<T>;
  limit(limit: number): HorizonHistoryCallBuilder<T>;
  call(): Promise<Horizon.ServerApi.CollectionPage<T>>;
};

export class HorizonClient {
  private cachedNetworkStats?: { value: Horizon.HorizonApi.FeeStatsResponse; timestamp: number };

  constructor(private readonly horizon: Horizon.Server) {}

  async getNetworkStats(force = false) {
    const now = Date.now();
    if (
      force ||
      this.cachedNetworkStats === undefined ||
      now - this.cachedNetworkStats.timestamp > LEDGER_TIME_MS
    ) {
      this.cachedNetworkStats = {
        value: await this.horizon.feeStats(),
        timestamp: now,
      };
    }

    return this.cachedNetworkStats.value;
  }

  async getPayments(query: HorizonHistoryQuery) {
    return await HorizonClient.collectHistory(
      this.horizon.payments().forAccount(query.accountId),
      query
    );
  }

  async getOperations(query: HorizonHistoryQuery) {
    return await HorizonClient.collectHistory(
      this.horizon.operations().forAccount(query.accountId),
      query
    );
  }

  private static async collectHistory<T extends HorizonHistoryRecord>(
    builder: HorizonHistoryCallBuilder<T>,
    { sinceMs, afterCursor }: HorizonHistoryQuery
  ) {
    const limited = builder.limit(HORIZON_MAX_PAGE_LIMIT);

    return RedstoneCommon.isDefined(afterCursor)
      ? await HorizonClient.collectAfter(limited.cursor(afterCursor).order("asc").call())
      : await HorizonClient.collectSince(limited.order("desc").call(), sinceMs);
  }

  private static async collectSince<T extends HorizonHistoryRecord>(
    firstPage: Promise<Horizon.ServerApi.CollectionPage<T>>,
    sinceMs: number
  ) {
    const records: T[] = [];
    let page = await firstPage;

    for (;;) {
      records.push(...page.records);
      const oldest = page.records.at(-1);

      if (!oldest || Date.parse(oldest.created_at) < sinceMs) {
        return records;
      }

      page = await page.next();
    }
  }

  private static async collectAfter<T extends HorizonHistoryRecord>(
    firstPage: Promise<Horizon.ServerApi.CollectionPage<T>>
  ) {
    const records: T[] = [];
    let page = await firstPage;

    for (;;) {
      records.push(...page.records);

      if (page.records.length < HORIZON_MAX_PAGE_LIMIT) {
        return records;
      }

      page = await page.next();
    }
  }
}
