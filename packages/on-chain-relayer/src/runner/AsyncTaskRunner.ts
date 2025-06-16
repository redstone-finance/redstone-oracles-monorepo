import { RedstoneCommon, RedstoneLogger } from "@redstone-finance/utils";
import { AsyncTask, SimpleIntervalJob, ToadScheduler } from "toad-scheduler";
import { RelayerConfig } from "../config/RelayerConfig";
import { getContractFacade } from "../facade/get-contract-facade";
import { IterationOptions, runIteration } from "./run-iteration";

export class AsyncTaskRunner {
  static async run(
    relayerConfig: RelayerConfig,
    logger: RedstoneLogger,
    iterationOptionsOverride: Partial<IterationOptions>
  ) {
    const contractFacade = await getContractFacade(relayerConfig);

    const task = new AsyncTask(
      "Relayer task",
      async () =>
        await runIteration(
          contractFacade,
          relayerConfig,
          iterationOptionsOverride
        ),
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
