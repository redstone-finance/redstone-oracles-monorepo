import { RedstoneHealthcheck } from "@redstone-finance/healthcheck";
import {
  loggerFactory,
  RedstoneCommon,
  RedstoneLogger,
} from "@redstone-finance/utils";
import { config, ConsciouslyInvoked } from "./config/config";
import { RelayerConfig } from "./config/RelayerConfig";
import { splitRelayerConfig } from "./config/split-relayer-config";
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

  const configs = splitRelayerConfig(relayerConfig);
  if (configs[0] !== relayerConfig) {
    logger.log(
      `Splitting relayer config into ${configs.length} configs: [${configs.map((config) => `[${config.dataFeeds.toString()}]`).toString()}]`
    );
  }

  configs.forEach((config) => run(config, logger));
};

function run(relayerConfig: RelayerConfig, logger: RedstoneLogger) {
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
}
