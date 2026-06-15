import { ResultOf } from "@mysten/sui/graphql/schema";
import { AFFECTED_OBJECT_TRANSACTIONS_QUERY, RECEIVED_TRANSACTIONS_QUERY } from "./queries";

export type ReceivedTransactionsData = ResultOf<typeof RECEIVED_TRANSACTIONS_QUERY>;

export type ReceivedTransactionNodes = NonNullable<
  ReceivedTransactionsData["transactions"]
>["nodes"];

export type AffectedObjectTransactionsData = ResultOf<typeof AFFECTED_OBJECT_TRANSACTIONS_QUERY>;

export type RawGqlInput = {
  __typename?: string;
  bytes?: string | null;
  bcs?: string | null;
  address?: string | null;
};

export type RawGqlArgument = {
  __typename?: string;
  ix?: number | null;
};

export type RawGqlTxn = {
  __typename?: string;
  function?: { name?: string | null } | null;
  arguments?: RawGqlArgument[] | null;
};

export type RawGqlGasSummary = {
  computationCost?: string | null;
  storageCost?: string | null;
  storageRebate?: string | null;
  nonRefundableStorageFee?: string | null;
};

export type RawGqlEventNode = {
  contents?: { type?: { repr?: string | null } | null; json?: unknown } | null;
};

export type RawGqlEffects = {
  checkpoint?: { sequenceNumber?: string | number; timestamp?: string } | null;
  status?: string | null;
  gasEffects?: { gasSummary?: RawGqlGasSummary | null } | null;
  events?: { nodes: RawGqlEventNode[] } | null;
};

export type RawGqlTx = {
  digest?: string;
  sender?: { address?: string } | null;
  effects?: RawGqlEffects | null;
  gasInput?: { gasBudget?: string; gasPrice?: string } | null;
  kind?: {
    __typename?: string;
    inputs?: { nodes: RawGqlInput[] } | null;
    commands?: { nodes: RawGqlTxn[] } | null;
  } | null;
};
