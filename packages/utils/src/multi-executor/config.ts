import _ from "lodash";
import { Executor } from "./Executor";
import { FnDelegate } from "./FnBox";

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
} & FnDelegateConfig;

export type FnDelegateConfig = {
  descriptions?: (string | undefined)[];
  delegate?: FnDelegate;
};

export const DEFAULT_CONFIG: MultiExecutorConfig = {
  agreementQuorumNumber: 2,
  consensusQuorumRatio: 3 / 5,
  defaultMode: ExecutionMode.FALLBACK,
  multiAgreementShouldResolveUnagreedToUndefined: false,
};

export function makeBaseConfig(
  fnDelegateConfig: FnDelegateConfig,
  otherConfig: Partial<MultiExecutorConfig>
): MultiExecutorConfig {
  return _.assign({}, fnDelegateConfig, DEFAULT_CONFIG, otherConfig);
}
