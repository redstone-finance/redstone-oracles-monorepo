import {
  RedstoneCommon,
  loggerFactory,
  sendHealthcheckPing,
} from "@redstone-finance/utils";
import { AsyncTask, SimpleIntervalJob, ToadScheduler } from "toad-scheduler";
import { fileSystemConfigProvider } from "./FilesystemConfigProvider";
import { getIterationArgs } from "./args/get-iteration-args";
import {
  config,
  setConfigProvider,
  timelyOverrideSinceLastUpdate,
} from "./config";
import { getAdapterContract } from "./core/contract-interactions/get-adapter-contract";
import { updatePrices } from "./core/contract-interactions/update-prices";

setConfigProvider(fileSystemConfigProvider);
const relayerConfig = config();

const logger = loggerFactory("relayer/run");

logger.log(
  `Starting contract prices updater with relayer config ${JSON.stringify({
    ...relayerConfig,
    privateKey: "********",
  })}`
);

if (relayerConfig.temporaryUpdatePriceInterval !== -1) {
  timelyOverrideSinceLastUpdate(relayerConfig.temporaryUpdatePriceInterval);
}

const runIteration = async () => {
  const adapterContract = getAdapterContract();
  const iterationArgs = await getIterationArgs(adapterContract);

  void sendHealthcheckPing(relayerConfig.healthcheckPingUrl);
  logger.log(
    `Update condition ${
      iterationArgs.shouldUpdatePrices ? "" : "NOT "
    }satisfied: ${iterationArgs.message} block_number=${
      iterationArgs.args.blockTag
    }`
  );

  if (iterationArgs.shouldUpdatePrices) {
    await updatePrices(iterationArgs.args);
  }
};

const task = new AsyncTask("Relayer task", runIteration, (error) =>
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
