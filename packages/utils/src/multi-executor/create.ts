import { Executor } from "./Executor";
import { MultiExecutorFactory } from "./MultiExecutorFactory";

export enum ExecutionMode {
  RACE = "race",
  FALLBACK = "fallback",
  CONSENSUS_MEDIAN = "consensus_median",
  CONSENSUS_ALL_EQUAL = "consensus_all_equal",
  AGREEMENT = "agreement",
  MULTI_AGREEMENT = "multi_agreement",
}

export type NestedMethodConfig<T> = {
  [K in keyof T]?:
    | NestedMethodConfig<T[K]>
    | (T[K] extends unknown[]
        ? ExecutionMode
        : Exclude<ExecutionMode, ExecutionMode.MULTI_AGREEMENT>)
    | Executor<unknown>;
};

export type MultiExecutorConfig = {
  consensusQuorumRatio: number;
  agreementQuorumNumber: number;
  defaultMode: ExecutionMode;
  singleExecutionTimeoutMs?: number;
  allExecutionsTimeoutMs?: number;
  multiAgreementShouldResolveUnagreedToUndefined: boolean;
  descriptions?: (string | undefined)[];
};

export const DEFAULT_CONFIG: MultiExecutorConfig = {
  agreementQuorumNumber: 2,
  consensusQuorumRatio: 3 / 5,
  defaultMode: ExecutionMode.FALLBACK,
  multiAgreementShouldResolveUnagreedToUndefined: false,
};

export function create<T extends object>(
  instances: T[],
  methodConfig: NestedMethodConfig<T> = {},
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

export function createForSubInstances<T extends object, U extends object>(
  subject: T,
  callback: (arg: T) => U,
  methodConfig: NestedMethodConfig<U> = {},
  config: MultiExecutorConfig = DEFAULT_CONFIG
) {
  const instances =
    "__instances" in subject
      ? (subject.__instances as T[]).map(callback)
      : [callback(subject)];

  const descriptions =
    config.descriptions ??
    ("__descriptions" in subject
      ? (subject.__descriptions as (string | undefined)[] | undefined)
      : undefined);

  return create(instances, methodConfig, { descriptions, ...config });
}
