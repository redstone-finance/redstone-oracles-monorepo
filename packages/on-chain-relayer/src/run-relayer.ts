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
import { IterationOptions } from "./runner/run-iteration";
import { SendHealthcheckPingCollector } from "./SendHealthcheckPingCollector";

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
  if (configs[0] === relayerConfig) {
    run(relayerConfig, logger);

    return;
  }

  const sendHealtcheckPingCollector = new SendHealthcheckPingCollector(
    configs.length,
    relayerConfig.healthcheckPingUrl
  );

  logger.log(
    `Splitting relayer config into ${configs.length} configs: [${configs.map((config) => `[${config.dataFeeds.toString()}]`).toString()}]`
  );

  configs.forEach((config, index) =>
    run(config, logger, {
      sendHealthcheckPingCallback:
        sendHealtcheckPingCollector.sendHealthcheckPing(index),
    })
  );
};

function run(
  relayerConfig: RelayerConfig,
  logger: RedstoneLogger,
  iterationOptionsOverride: Partial<IterationOptions> = {}
) {
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
    void MqttRunner.run(relayerConfig, iterationOptionsOverride);
  } else {
    void AsyncTaskRunner.run(relayerConfig, logger, iterationOptionsOverride);
  }
}
