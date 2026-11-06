import {
  DecodedPreparedTransaction,
  ExpectedTransfer,
  TRANSFER_FACTORY_CHOICE,
  TRANSFER_FACTORY_ENTITY,
  TRANSFER_FACTORY_MODULE,
  verifyPreparedTransfer,
} from "../src/client/verify-prepared-transfer";

const SENDER = "zrodelko::1220aaaa";
const RECEIVER = "relayer::1220bbbb";
const ATTACKER = "attacker::1220cccc";
const DSO = "DSO::1220dddd";

const EXPECTED: ExpectedTransfer = {
  sender: SENDER,
  receiver: RECEIVER,
  amount: "1500000",
  instrumentAdmin: DSO,
  instrumentId: "Amulet",
  factoryContractId: "00factory",
  commandId: "cmd-1",
};

type TransferOverrides = Partial<{
  sender: string;
  receiver: string;
  amount: string;
  expectedAdmin: string;
  instrumentAdmin: string;
  instrumentId: string;
  labels: boolean;
}>;

const party = (value: string) => ({ sum: { oneofKind: "party", party: value } });
const text = (value: string) => ({ sum: { oneofKind: "text", text: value } });
const numeric = (value: string) => ({ sum: { oneofKind: "numeric", numeric: value } });

function record(fields: [string, unknown][], labels: boolean) {
  return {
    sum: {
      oneofKind: "record",
      record: { fields: fields.map(([label, value]) => ({ label: labels ? label : "", value })) },
    },
  };
}

function makeChoiceArgument(o: TransferOverrides = {}) {
  const labels = o.labels ?? true;
  const instrumentId = record(
    [
      ["admin", party(o.instrumentAdmin ?? DSO)],
      ["id", text(o.instrumentId ?? "Amulet")],
    ],
    labels
  );
  const transfer = record(
    [
      ["sender", party(o.sender ?? SENDER)],
      ["receiver", party(o.receiver ?? RECEIVER)],
      ["amount", numeric(o.amount ?? "1500000.0000000000")],
      ["instrumentId", instrumentId],
      ["requestedAt", { sum: { oneofKind: "timestamp", timestamp: 0n } }],
    ],
    labels
  );

  return record(
    [
      ["expectedAdmin", party(o.expectedAdmin ?? DSO)],
      ["transfer", transfer],
      ["extraArgs", record([], labels)],
    ],
    labels
  );
}

function makeExerciseNode(nodeId: string, overrides: Record<string, unknown> = {}) {
  return {
    nodeId,
    versionedNode: {
      oneofKind: "v1",
      v1: {
        nodeType: {
          oneofKind: "exercise",
          exercise: {
            contractId: "00factory",
            interfaceId: {
              moduleName: TRANSFER_FACTORY_MODULE,
              entityName: TRANSFER_FACTORY_ENTITY,
            },
            choiceId: TRANSFER_FACTORY_CHOICE,
            actingParties: [SENDER],
            chosenValue: makeChoiceArgument(),
            ...overrides,
          },
        },
      },
    },
  };
}

function makePrepared(
  exerciseOverrides: Record<string, unknown> = {},
  extra: Partial<{ roots: string[]; actAs: string[]; commandId: string }> = {}
) {
  return {
    transaction: {
      roots: extra.roots ?? ["0"],
      nodes: [makeExerciseNode("0", exerciseOverrides), makeExerciseNode("1")],
    },
    metadata: {
      submitterInfo: { actAs: extra.actAs ?? [SENDER], commandId: extra.commandId ?? "cmd-1" },
    },
  } as DecodedPreparedTransaction;
}

describe("verifyPreparedTransfer", () => {
  it("accepts the transfer that was requested", () => {
    expect(() => verifyPreparedTransfer(makePrepared(), EXPECTED)).not.toThrow();
  });

  it("accepts records without labels when the field order matches", () => {
    const prepared = makePrepared({ chosenValue: makeChoiceArgument({ labels: false }) });

    expect(() => verifyPreparedTransfer(prepared, EXPECTED)).not.toThrow();
  });

  it("compares the amount as a decimal", () => {
    expect(() =>
      verifyPreparedTransfer(makePrepared(), { ...EXPECTED, amount: "1500000.000" })
    ).not.toThrow();
  });

  it.each<[string, TransferOverrides, RegExp]>([
    ["receiver", { receiver: ATTACKER }, /receiver mismatch/],
    ["amount", { amount: "1500000.0000000001" }, /amount mismatch/],
    ["sender", { sender: ATTACKER }, /sender mismatch/],
    ["expectedAdmin", { expectedAdmin: ATTACKER }, /expectedAdmin mismatch/],
    ["instrument admin", { instrumentAdmin: ATTACKER }, /instrumentId.admin mismatch/],
    ["instrument id", { instrumentId: "NotAmulet" }, /instrumentId.id mismatch/],
  ])("rejects a substituted %s", (_, overrides, error) => {
    const prepared = makePrepared({ chosenValue: makeChoiceArgument(overrides) });

    expect(() => verifyPreparedTransfer(prepared, EXPECTED)).toThrow(error);
  });

  it("rejects a record whose labels do not match the field positions", () => {
    const choiceArgument = makeChoiceArgument();
    const transfer = choiceArgument.sum.record.fields[1].value as ReturnType<typeof record>;
    const [sender, receiver] = transfer.sum.record.fields;
    transfer.sum.record.fields[0] = { ...receiver, value: party(SENDER) };
    transfer.sum.record.fields[1] = { ...sender, value: party(RECEIVER) };

    expect(() =>
      verifyPreparedTransfer(makePrepared({ chosenValue: choiceArgument }), EXPECTED)
    ).toThrow(/no field 'sender' at position 0/);
  });

  it.each<[string, Record<string, unknown>, RegExp]>([
    ["factory contract", { contractId: "00other" }, /root contractId mismatch/],
    ["choice", { choiceId: "TransferFactory_PublicFetch" }, /root choice mismatch/],
    [
      "interface",
      { interfaceId: { moduleName: "Evil.Module", entityName: TRANSFER_FACTORY_ENTITY } },
      /root interface module mismatch/,
    ],
    ["acting parties", { actingParties: [SENDER, ATTACKER] }, /root actingParties mismatch/],
    ["choice argument", { chosenValue: party(SENDER) }, /is party, expected record/],
  ])("rejects a root exercise with a different %s", (_, overrides, error) => {
    expect(() => verifyPreparedTransfer(makePrepared(overrides), EXPECTED)).toThrow(error);
  });

  it("rejects an extra root node", () => {
    const prepared = makePrepared({}, { roots: ["0", "1"] });

    expect(() => verifyPreparedTransfer(prepared, EXPECTED)).toThrow(/exactly one root node/);
  });

  it("rejects a root that is not an exercise", () => {
    const prepared = makePrepared();
    prepared.transaction!.nodes[0].versionedNode.v1!.nodeType = { oneofKind: "create" };

    expect(() => verifyPreparedTransfer(prepared, EXPECTED)).toThrow(/is not an exercise/);
  });

  it("rejects a different submitter", () => {
    const prepared = makePrepared({}, { actAs: [SENDER, ATTACKER] });

    expect(() => verifyPreparedTransfer(prepared, EXPECTED)).toThrow(/actAs mismatch/);
  });

  it("rejects a different command id", () => {
    const prepared = makePrepared({}, { commandId: "cmd-other" });

    expect(() => verifyPreparedTransfer(prepared, EXPECTED)).toThrow(/commandId mismatch/);
  });
});
