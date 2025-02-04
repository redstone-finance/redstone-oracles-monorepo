import { Executor } from "./Executor";
import { MultiExecutorFactory } from "./MultiExecutorFactory";

export enum ExecutionMode {
  RACE = "race",
  FALLBACK = "fallback",
  CONSENSUS_MEDIAN = "consensus_median",
  CONSENSUS_MODE = "consensus_mode",
  CONSENSUS_ALL_EQUALS = "consensus_all_equals",
}

export type MethodConfig<T> = {
  [K in keyof T]?: ExecutionMode | Executor;
};

export type MultiExecutorConfig = {
  quorumRatio: number;
  defaultMode: ExecutionMode;
  singleExecutionTimeoutMs?: number;
  allExecutionsTimeoutMs?: number;
};

export const DEFAULT_CONFIG: MultiExecutorConfig = {
  quorumRatio: 3 / 5,
  defaultMode: ExecutionMode.FALLBACK,
};

export function create<T extends object>(
  instances: T[],
  methodConfig: MethodConfig<T> = {},
  config: MultiExecutorConfig = DEFAULT_CONFIG
): T {
  if (!instances.length) {
    throw new Error("At least one instance is required");
  }

  return new MultiExecutorFactory(
    instances,
    methodConfig,
    config
  ).createProxy();
}
