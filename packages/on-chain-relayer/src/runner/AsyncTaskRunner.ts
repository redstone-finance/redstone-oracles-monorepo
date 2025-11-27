import { terminateWithUpdateConfigExitCode } from "@redstone-finance/internal-utils";
import { RedstoneCommon, RedstoneLogger } from "@redstone-finance/utils";
import { AsyncTask, SimpleIntervalJob, ToadScheduler } from "toad-scheduler";
import { RelayerConfig } from "../config/RelayerConfig";
import { getContractFacade } from "../facade/get-contract-facade";
import { IterationOptions, runIteration } from "./run-iteration";

let shouldGracefullyShutdown = false;

export class AsyncTaskRunner {
  static async run(
    relayerConfig: RelayerConfig,
    logger: RedstoneLogger,
    iterationOptionsOverride: Partial<IterationOptions>
  ) {
    {
      process.on("SIGTERM", () => {
        logger.info("SIGTERM received, NodeRunner scheduled for a graceful shut down.");
        shouldGracefullyShutdown = true;
      });
    }
    const contractFacade = await getContractFacade(relayerConfig);

    const task = new AsyncTask(
      "Relayer task",
      async () => {
        try {
          if (shouldGracefullyShutdown) {
            logger.info(`Shutdown scheduled, not running next iteration`);
            return;
          }
          await runIteration(contractFacade, relayerConfig, iterationOptionsOverride);
        } finally {
          if (shouldGracefullyShutdown) {
            terminateWithUpdateConfigExitCode();
          }
        }
      },
      (error) =>
        logger.log(
          "Unhandled error occurred during iteration:",
          RedstoneCommon.stringifyError(error)
        )
    );

    const job = new SimpleIntervalJob(
      {
        milliseconds: relayerConfig.relayerIterationInterval,
        runImmediately: true,
      },
      task,
      { preventOverrun: true }
    );

    const scheduler = new ToadScheduler();
    scheduler.addSimpleIntervalJob(job);
  }
}
