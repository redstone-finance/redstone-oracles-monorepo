import { RedstoneHealthcheck } from "@redstone-finance/healthcheck";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { config, ConsciouslyInvoked } from "./config/config";
import { timelyOverrideSinceLastUpdate } from "./config/timely-override-since-last-update";
import { AsyncTaskRunner } from "./runner/AsyncTaskRunner";
import { MqttRunner } from "./runner/MqttRunner";

export const runRelayer = async () => {
  const relayerConfig = await config(ConsciouslyInvoked);
  const logger = loggerFactory("relayer/run");

  logger.log(
    `Starting ${relayerConfig.adapterContractType} contract prices updater with relayer config ${JSON.stringify(
      {
        ...relayerConfig,
        privateKey: "********",
      }
    )}`
  );

  if (relayerConfig.temporaryUpdatePriceInterval !== -1) {
    timelyOverrideSinceLastUpdate(
      relayerConfig,
      relayerConfig.temporaryUpdatePriceInterval
    );
  }

  RedstoneHealthcheck.enableWithDefaultConfig();

  process.on("unhandledRejection", (reason) => {
    logger.error(
      "THIS PATH SHOULD NEVER HAVE HAPPENED, CHECK FLOATING PROMISES!\n" +
        `Unhandled Rejection at: ${RedstoneCommon.stringifyError(reason)}`
    );
  });

  if (relayerConfig.runWithMqtt) {
    void MqttRunner.run(relayerConfig);
  } else {
    void AsyncTaskRunner.run(relayerConfig, logger);
  }
};
