import { RedstoneCommon, RedstoneLogger } from "@redstone-finance/utils";
import { AsyncTask, SimpleIntervalJob, ToadScheduler } from "toad-scheduler";
import { getContractFacade } from "../facade/get-contract-facade";
import { runIteration } from "./run-iteration";

import { RelayerConfig } from "../config/RelayerConfig";

export class AsyncTaskRunner {
  static async run(relayerConfig: RelayerConfig, logger: RedstoneLogger) {
    const contractFacade = await getContractFacade(relayerConfig);

    const task = new AsyncTask(
      "Relayer task",
      async () => {
        return await runIteration(contractFacade, relayerConfig);
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
