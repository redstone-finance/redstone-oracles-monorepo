import { loggerFactory, sendHealthcheckPing } from "@redstone-finance/utils";
import _ from "lodash";
import { isOevRelayerConfig } from "../config/is-oev-relayer-config";
import { isPaused } from "../config/is_paused";
import { RelayerConfig } from "../config/RelayerConfig";
import { ContractFacade } from "../facade/ContractFacade";
import {
  getIterationArgsProvider,
  IterationArgsProvider,
} from "../facade/get-iteration-args-provider";

export type IterationLogger = {
  log(message: string, ...args: unknown[]): void;
  warn?: (message: string, ...args: unknown[]) => void;
};

export type IterationOptions = {
  logger: IterationLogger;
  iterationArgsProvider: IterationArgsProvider;
  sendHealthcheckPingCallback: (healthcheckPingUrl?: string) => Promise<void>;
};

const defaultLogger = loggerFactory("relayer/run-iteration");

const defaultIterationOptions = (relayerConfig: RelayerConfig) =>
  ({
    logger: defaultLogger,
    iterationArgsProvider: getIterationArgsProvider(relayerConfig),
    sendHealthcheckPingCallback: sendHealthcheckPing,
  }) as IterationOptions;

export const runIteration = async (
  contractFacade: ContractFacade,
  relayerConfig: RelayerConfig,
  options: Partial<IterationOptions> = {}
) => {
  const { logger, iterationArgsProvider, sendHealthcheckPingCallback } = {
    ...defaultIterationOptions(relayerConfig),
    ...options,
  };

  if (isPaused(relayerConfig)) {
    (logger.warn ?? logger.log)(
      `Relayer is paused until ${relayerConfig.isPausedUntil?.toString()}`
    );

    return;
  }
  const iterationStart = performance.now();
  const shouldUpdateContext =
    await contractFacade.getShouldUpdateContext(relayerConfig);
  const iterationArgs = await iterationArgsProvider(
    shouldUpdateContext,
    relayerConfig
  );
  void sendHealthcheckPingCallback(relayerConfig.healthcheckPingUrl);
  const messages = _.map(iterationArgs.messages, "message");
  const message = `Update condition ${
    iterationArgs.shouldUpdatePrices ? "" : "NOT "
  }satisfied; block_number=${
    iterationArgs.args.blockTag
  } iteration_duration=${performance.now() - iterationStart}`;

  logger.log(message, messages);

  if (
    iterationArgs.shouldUpdatePrices ||
    shouldForceUpdateInEachIteration(relayerConfig)
  ) {
    iterationArgs.additionalUpdateMessages?.forEach(({ message, args }) =>
      logger.log(message, args)
    );

    await contractFacade.updatePrices(iterationArgs.args, {
      canOmitFallbackAfterFailing: !iterationArgs.shouldUpdatePrices,
      allFeedIds: relayerConfig.dataFeeds,
    });
  }

  return iterationArgs.shouldUpdatePrices;
};

function shouldForceUpdateInEachIteration(relayerConfig: RelayerConfig) {
  return isOevRelayerConfig(relayerConfig);
}
