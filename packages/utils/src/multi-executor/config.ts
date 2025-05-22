import _ from "lodash";
import { isDefined } from "../common";
import { Executor } from "./Executor";
import { FnDelegate } from "./FnBox";
import { QuarantinedListFnDelegate } from "./QuarantinedListFnDelegate";

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
  delegate?: FnDelegate;
};

export const DEFAULT_CONFIG: MultiExecutorConfig = {
  agreementQuorumNumber: 2,
  consensusQuorumRatio: 3 / 5,
  defaultMode: ExecutionMode.FALLBACK,
  multiAgreementShouldResolveUnagreedToUndefined: false,
};

export function makeRpcUrlsBasedConfig(
  rpcUrls: (string | undefined)[],
  chainId: string,
  otherConfig: Partial<MultiExecutorConfig>
): MultiExecutorConfig {
  return _.assign(
    {
      descriptions: rpcUrls,
      delegate: new QuarantinedListFnDelegate(
        rpcUrls.filter(isDefined),
        chainId
      ),
    },
    DEFAULT_CONFIG,
    otherConfig
  );
}
