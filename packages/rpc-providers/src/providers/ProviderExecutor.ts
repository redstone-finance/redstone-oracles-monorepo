import {
  CuratedRpcList,
  RedstoneCommon,
  RedstoneLogger,
  RpcIdentifier,
} from "@redstone-finance/utils";
import { providers } from "ethers";

export type ProviderWithIdentifier = {
  provider: providers.Provider;
  identifier: RpcIdentifier;
};

export class ProviderExecutor<T> {
  private readonly runningPromises: { [p: string]: Promise<T> | undefined } = {};
  private static skippedRuns = 0;
  private static totalRuns = 0;
  private static runningCount = 0;

  constructor(
    private readonly opName: string,
    private readonly opCreator: (providerWithIdentifier: ProviderWithIdentifier) => Promise<T>,
    private readonly logger: RedstoneLogger,
    private readonly curatedRpcList?: CuratedRpcList,
    private readonly valueValidator?: (
      providerWithIdentifier: ProviderWithIdentifier,
      value: T
    ) => void
  ) {}

  async run(providerWithIdentifier: ProviderWithIdentifier) {
    const identifier = providerWithIdentifier.identifier;
    const runningPromise = this.runningPromises[identifier];
    ProviderExecutor.totalRuns++;

    if (runningPromise) {
      ProviderExecutor.skippedRuns++;
      return await runningPromise;
    }

    ProviderExecutor.runningCount++;
    this.logger.debug(
      `Calling op=${this.opName} for ${identifier} (currently: ${ProviderExecutor.runningCount} run${RedstoneCommon.getS(ProviderExecutor.runningCount)}` +
        `, total skipped: ${ProviderExecutor.skippedRuns}/${ProviderExecutor.totalRuns})`,
      {
        start: true,
        opName: this.opName,
        identifier,
        totalRunningCount: ProviderExecutor.runningCount,
        skippedRuns: ProviderExecutor.skippedRuns,
        totalRuns: ProviderExecutor.totalRuns,
      }
    );
    this.runningPromises[identifier] = this.opCreator(providerWithIdentifier);

    try {
      const blockNumber = await this.runningPromises[identifier];

      this.valueValidator?.(providerWithIdentifier, blockNumber);
      this.updateScore(identifier, false);

      this.logger.trace(`Did finish op=${this.opName} for ${identifier}`, {
        finish: true,
        opName: this.opName,
        identifier,
      });

      return blockNumber;
    } catch (e) {
      this.logger.error(
        `Failed op=${this.opName} for ${identifier}, error: ${RedstoneCommon.stringifyError(e)}`,
        { error: true, opName: this.opName, identifier }
      );
      this.updateScore(identifier, true);

      throw e;
    } finally {
      delete this.runningPromises[identifier];
      ProviderExecutor.runningCount--;
    }
  }

  private updateScore(identifier: RpcIdentifier, error: boolean) {
    this.curatedRpcList?.scoreRpc(identifier, { error });
  }
}
