import { Executor } from "./Executor";
import { MultiExecutorFactory } from "./MultiExecutorFactory";

export enum ExecutionMode {
  RACE = "race",
  FALLBACK = "fallback",
  CONSENSUS_MEDIAN = "consensus_median",
  CONSENSUS_ALL_EQUAL = "consensus_all_equal",
  AGREEMENT = "agreement",
}

export type MethodConfig<T> = {
  [K in keyof T]?: ExecutionMode | Executor;
};

export type MultiExecutorConfig = {
  consensusQuorumRatio: number;
  agreementQuorumNumber: number;
  defaultMode: ExecutionMode;
  singleExecutionTimeoutMs?: number;
  allExecutionsTimeoutMs?: number;
};

export const DEFAULT_CONFIG: MultiExecutorConfig = {
  agreementQuorumNumber: 2,
  consensusQuorumRatio: 3 / 5,
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
