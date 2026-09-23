import { MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import type { Connection } from "@solana/web3.js";

export const SOLANA_SLOT_TIME_INTERVAL_MS = 400;

export class SolanaBlockNumberProvider extends RedstoneCommon.BlockNumberProvider {
  protected override readonly description = "solana slot";
  protected override readonly waitingIntervalMs = SOLANA_SLOT_TIME_INTERVAL_MS;
  protected override readonly maxIterationCount = Math.floor(
    MultiExecutor.SINGLE_EXECUTION_TIMEOUT_MS / SOLANA_SLOT_TIME_INTERVAL_MS
  );

  constructor(private readonly connection: Connection) {
    super();
  }

  protected override async fetchBlockNumber() {
    return await this.connection.getSlot();
  }
}
