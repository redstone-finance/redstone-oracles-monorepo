import { BlockProvider, WriteContractAdapter } from "@redstone-finance/multichain-kit";
import { DataPackagesResponseCache } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";
import { RelayerConfig } from "../config/RelayerConfig";
import { timelyOverrideSinceLastUpdate } from "../config/timely-override-since-last-update";
import { ContractFacade } from "../facade/ContractFacade";
import { IterationLogger, runIteration } from "./run-iteration";

type IterationStack = {
  adapter: WriteContractAdapter;
  blockProvider: BlockProvider;
  logger: IterationLogger;
};

export async function runManyIterations(
  configPromises: Record<string, Promise<RelayerConfig>>,
  makeStack: (name: string, config: RelayerConfig) => IterationStack,
  useTimelyOverride: boolean = false
) {
  const settledConfigs = await Promise.allSettled(Object.values(configPromises));
  const configMap = _.zipObject(Object.keys(configPromises), settledConfigs);

  const iterations = _.mapValues(configMap, (settledConfig, name) =>
    settledConfig.status === "fulfilled"
      ? runSingleIteration(
          makeStack(name, settledConfig.value),
          settledConfig.value,
          useTimelyOverride
        )
      : Promise.reject(new Error(RedstoneCommon.stringifyError(settledConfig.reason)))
  );

  const results = (await Promise.allSettled(Object.values(iterations))).map((result) =>
    result.status === "fulfilled"
      ? { result: "OK", didRun: result.value }
      : { result: "Error", reason: RedstoneCommon.stringifyError(result.reason) }
  );

  return _.zipObject(Object.keys(iterations), results);
}

export async function runSingleIteration(
  stack: IterationStack,
  config: RelayerConfig,
  useTimelyOverride: boolean = false,
  cache?: DataPackagesResponseCache
) {
  if (useTimelyOverride && config.temporaryUpdatePriceInterval !== -1) {
    timelyOverrideSinceLastUpdate(config, config.temporaryUpdatePriceInterval);
  }

  return await runIteration(
    new ContractFacade(stack.adapter, stack.blockProvider, config, cache),
    config,
    {
      logger: stack.logger,
    }
  );
}
