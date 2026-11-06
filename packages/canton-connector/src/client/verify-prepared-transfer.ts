import Decimal from "decimal.js";

// Structural subset of the @canton-network/core-ledger-proto PreparedTransaction model,
// limited to the fields the transfer check reads.
type Identifier = { moduleName: string; entityName: string };

type Value = { sum: { oneofKind: string | undefined; [kind: string]: unknown } };

type RecordField = { label: string; value?: Value };

type ExerciseNode = {
  contractId: string;
  interfaceId?: Identifier;
  choiceId: string;
  chosenValue?: Value;
  actingParties: string[];
};

type TransactionNode = {
  nodeId: string;
  versionedNode: {
    oneofKind: string | undefined;
    v1?: { nodeType: { oneofKind: string | undefined; exercise?: ExerciseNode } };
  };
};

export type DecodedPreparedTransaction = {
  transaction?: { roots: string[]; nodes: TransactionNode[] };
  metadata?: { submitterInfo?: { actAs: string[]; commandId: string } };
};

export type ExpectedTransfer = {
  sender: string;
  receiver: string;
  amount: string;
  instrumentAdmin: string;
  instrumentId: string;
  factoryContractId: string;
  commandId: string;
};

export const TRANSFER_FACTORY_MODULE = "Splice.Api.Token.TransferInstructionV1";
export const TRANSFER_FACTORY_ENTITY = "TransferFactory";
export const TRANSFER_FACTORY_CHOICE = "TransferFactory_Transfer";

export function verifyPreparedTransfer(
  prepared: DecodedPreparedTransaction,
  expected: ExpectedTransfer
) {
  const submitterInfo = prepared.metadata?.submitterInfo;
  expectEqual("actAs", submitterInfo?.actAs, [expected.sender]);
  expectEqual("commandId", submitterInfo?.commandId, expected.commandId);

  const exercise = getSingleRootExercise(prepared);
  expectEqual("root contractId", exercise.contractId, expected.factoryContractId);
  expectEqual("root interface module", exercise.interfaceId?.moduleName, TRANSFER_FACTORY_MODULE);
  expectEqual("root interface entity", exercise.interfaceId?.entityName, TRANSFER_FACTORY_ENTITY);
  expectEqual("root choice", exercise.choiceId, TRANSFER_FACTORY_CHOICE);
  expectEqual("root actingParties", exercise.actingParties, [expected.sender]);

  // Field order follows Splice.Api.Token.TransferInstructionV1; labels, when present, must match too.
  const choiceArgument = exercise.chosenValue;
  const transfer = getField(choiceArgument, "transfer", 1);
  const instrumentId = getField(transfer, "instrumentId", 3);

  expectEqual(
    "expectedAdmin",
    getParty(getField(choiceArgument, "expectedAdmin", 0)),
    expected.instrumentAdmin
  );
  expectEqual("sender", getParty(getField(transfer, "sender", 0)), expected.sender);
  expectEqual("receiver", getParty(getField(transfer, "receiver", 1)), expected.receiver);
  expectEqual(
    "instrumentId.admin",
    getParty(getField(instrumentId, "admin", 0)),
    expected.instrumentAdmin
  );
  expectEqual("instrumentId.id", getText(getField(instrumentId, "id", 1)), expected.instrumentId);

  const amount = getNumeric(getField(transfer, "amount", 2));
  if (!new Decimal(amount).equals(new Decimal(expected.amount))) {
    throw mismatch("amount", amount, expected.amount);
  }
}

function getSingleRootExercise(prepared: DecodedPreparedTransaction) {
  const roots = prepared.transaction?.roots ?? [];
  if (roots.length !== 1) {
    throw new Error(`Prepared transaction must have exactly one root node, got ${roots.length}`);
  }

  const root = prepared.transaction?.nodes.find((node) => node.nodeId === roots[0]);
  const exercise = root?.versionedNode.v1?.nodeType.exercise;
  if (root?.versionedNode.oneofKind !== "v1" || !exercise) {
    throw new Error(`Prepared transaction root node ${roots[0]} is not an exercise`);
  }

  return exercise;
}

function getField(value: Value | undefined, label: string, index: number) {
  const fields = getSum<{ fields: RecordField[] }>(value, "record", label).fields;
  const field = fields.at(index);
  if (!field || (field.label !== "" && field.label !== label)) {
    throw new Error(`Prepared transaction record has no field '${label}' at position ${index}`);
  }

  return field.value;
}

function getParty(value: Value | undefined) {
  return getSum<string>(value, "party", "party");
}

function getText(value: Value | undefined) {
  return getSum<string>(value, "text", "text");
}

function getNumeric(value: Value | undefined) {
  return getSum<string>(value, "numeric", "numeric");
}

function getSum<T>(value: Value | undefined, kind: string, what: string) {
  if (value?.sum.oneofKind !== kind) {
    throw new Error(
      `Prepared transaction value for '${what}' is ${value?.sum.oneofKind ?? "missing"}, expected ${kind}`
    );
  }

  return value.sum[kind] as T;
}

function expectEqual(what: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw mismatch(what, actual, expected);
  }
}

function mismatch(what: string, actual: unknown, expected: unknown) {
  return new Error(
    `Prepared transaction ${what} mismatch: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`
  );
}
