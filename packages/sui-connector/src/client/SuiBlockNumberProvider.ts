import { MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import type { SuiClient } from "./SuiClient";

const CHECKPOINT_INTERVAL_MS = 250;

export class SuiBlockNumberProvider extends RedstoneCommon.BlockNumberProvider {
  protected override readonly description = "sui checkpoint";
  protected override readonly waitingIntervalMs = CHECKPOINT_INTERVAL_MS;
  protected override readonly maxIterationCount = Math.floor(
    MultiExecutor.SINGLE_EXECUTION_TIMEOUT_MS / CHECKPOINT_INTERVAL_MS
  );

  constructor(private readonly client: SuiClient) {
    super();
  }

  protected override async fetchBlockNumber() {
    return await this.client.getBlockNumber();
  }
}
