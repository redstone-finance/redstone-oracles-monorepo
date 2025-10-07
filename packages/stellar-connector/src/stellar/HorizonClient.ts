import { Horizon } from "@stellar/stellar-sdk";
import { LEDGER_TIME_MS } from "./StellarConstants";

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
}
