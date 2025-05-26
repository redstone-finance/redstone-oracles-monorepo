import { Connection, PublicKey } from "@solana/web3.js";
import { accounts, generated, types } from "@sqds/multisig";
import "dotenv/config";
import { SquadsMultisig } from "../ledger/multi-sig-utils";
import { KNOWN_PROGRAMS, SYSTEM_ACCOUNTS } from "./address-book";

const {
  configTransactionCreateStruct,
  vaultTransactionCreateStruct,
  proposalCreateStruct,
  vaultTransactionExecuteStruct,
  proposalApproveStruct,
} = generated;
const { transactionMessageBeet } = types;
const { Proposal, ConfigTransaction } = accounts;

const INSTRUCTION_BOOK = {
  multisigCreateVaultTx: [48, 250, 78, 168, 208, 226, 218, 211],
  multisigProposeTx: [220, 60, 73, 224, 30, 108, 79, 159],
  multisigApproveTx: [144, 37, 164, 136, 188, 216, 42, 248],
  multisigExecuteVaultTx: [194, 8, 161, 87, 153, 164, 25, 171],
  multisigCreateConfigTx: [155, 236, 87, 228, 137, 75, 81, 39],
  multisigExecuteConfigTx: [114, 146, 244, 189, 252, 140, 36, 40],
  upgradeTx: [3, 0, 0, 0],
  transferAuthority: [4, 0, 0, 0],
  closeBuffer: [5, 0, 0, 0],
  verifyProgram: [175, 175, 109, 31, 13, 152, 155, 237],
};

function assertWarn(x: boolean, msg: string) {
  if (!x) {
    console.error(msg);
  }
}

function getNameFromBook(book: Record<string, string>, key: PublicKey) {
  return `${book[key.toBase58()]}(${key.toBase58()})`;
}

function assertWarnAllKnown(
  accounts: PublicKey[],
  book: Record<string, string>
) {
  const unknown = accounts.map((k) => k.toBase58()).filter((k) => !(k in book));
  assertWarn(
    unknown.length === 0,
    `❗ Unknown accounts in transaction: ${unknown.toString()}, double check them ❗`
  );
}

export interface InstructionLog {
  type: string;
  details: Record<string, unknown>;
  inner?: InstructionLog[];
}

function parseMultisigConfigActions(
  book: Record<string, string>,
  actions: types.ConfigAction[]
): InstructionLog {
  const addedAccounts = actions
    .filter((a) => a.__kind === "AddMember")
    .map((a) => a.newMember.key);
  const details: Record<string, unknown> = {};

  if (addedAccounts.length !== 0) {
    assertWarnAllKnown(addedAccounts, book);
    details.addedAccounts = addedAccounts.map((m) => getNameFromBook(book, m));
  }

  const threshold = actions.filter((a) => a.__kind === "ChangeThreshold");

  if (threshold.length !== 0) {
    details.newThreshold = threshold[0].newThreshold;
  }

  const otherActions = actions.filter(
    (a) => a.__kind !== "AddMember" && a.__kind !== "ChangeThreshold"
  );
  assertWarn(
    otherActions.length === 0,
    `❗ Other actions in the tx: ${otherActions.toString()}`
  );

  return { type: "ConfigActions", details };
}

async function parseTxAtIndex(
  connection: Connection,
  squadUtils: SquadsMultisig,
  book: Record<string, string>,
  txId: number
): Promise<InstructionLog> {
  const inner: InstructionLog[] = [];
  try {
    const txInfo = await squadUtils.txInfo(Number(txId));
    for (const innerIx of txInfo.message.instructions) {
      const log = await parseIx(
        connection,
        squadUtils,
        book,
        Buffer.from(innerIx.data),
        innerIx.programIdIndex,
        [...innerIx.accountIndexes],
        txInfo.message.accountKeys
      );
      inner.push(log);
    }
    return { type: "TransactionAtIndex", details: { txId }, inner };
  } catch (e) {
    const txPda = squadUtils.txPda(txId);
    const configTx = await ConfigTransaction.fromAccountAddress(
      connection,
      txPda
    );
    const actionsLog = parseMultisigConfigActions(book, configTx.actions);
    return { type: "ConfigTx", details: { txId }, inner: [actionsLog] };
  }
}

export async function parseIx(
  connection: Connection,
  squadUtils: SquadsMultisig,
  book: Record<string, string>,
  ix: Buffer,
  programIdx: number,
  accountIdxs: number[],
  accounts: PublicKey[]
): Promise<InstructionLog> {
  return await matchInstruction(ix)(
    connection,
    squadUtils,
    book,
    ix,
    programIdx,
    accountIdxs,
    accounts
  );
}

function parseUpgradeTx(
  _connection: Connection,
  _squadUtils: SquadsMultisig,
  book: Record<string, string>,
  _ix: Buffer,
  programIdx: number,
  accountIdxs: number[],
  accounts: PublicKey[]
): Promise<InstructionLog> {
  assertWarn(
    accounts[programIdx].toBase58() ===
      SYSTEM_ACCOUNTS.bpfLoaderUpgradeable.toBase58(),
    "❗ Upgrade tx should use bpfLoaderUpgradeable program."
  );

  assertWarn(
    accountIdxs.length === 7,
    `❗ Upgrade tx expects 7 accounts got: ${accountIdxs.length}`
  );

  const programData = getNameFromBook(book, accounts[accountIdxs[0]]);
  const program = getNameFromBook(book, accounts[accountIdxs[1]]);
  const buffer = getNameFromBook(book, accounts[accountIdxs[2]]);
  const spill = getNameFromBook(book, accounts[accountIdxs[3]]);
  const authority = getNameFromBook(book, accounts[accountIdxs[6]]);

  return Promise.resolve({
    type: "UpgradeTx",
    details: {
      program,
      authority,
      buffer,
      spill,
      programData,
    },
  });
}

async function parseMultisigApproveTx(
  connection: Connection,
  squadUtils: SquadsMultisig,
  book: Record<string, string>,
  ix: Buffer,
  programIdx: number,
  accountIdxs: number[],
  accounts: PublicKey[]
): Promise<InstructionLog> {
  const _deserialized = proposalApproveStruct.deserialize(ix);
  assertWarn(
    accounts[programIdx].toBase58() === KNOWN_PROGRAMS.squadAddress.toBase58(),
    "❗ Multisig transactions should use squad program."
  );

  const proposalAccount = await Proposal.fromAccountAddress(
    connection,
    accounts[accountIdxs[2]]
  );
  const txId = proposalAccount.transactionIndex;

  book[accounts[accountIdxs[2]].toBase58()] = `proposal-${txId.toString()}`;

  assertWarnAllKnown(accounts, book);

  const multisig = getNameFromBook(book, accounts[accountIdxs[0]]);
  const member = getNameFromBook(book, accounts[accountIdxs[1]]);
  const proposal = getNameFromBook(book, accounts[accountIdxs[2]]);

  const inner = [
    await parseTxAtIndex(connection, squadUtils, book, Number(txId)),
  ];

  return {
    type: "MultisigApproveTx",
    details: { multisig, member, proposal, txId },
    inner,
  };
}

async function parseCreateVaultTx(
  connection: Connection,
  squadUtils: SquadsMultisig,
  book: Record<string, string>,
  ix: Buffer,
  programIdx: number,
  accountIdxs: number[],
  accounts: PublicKey[]
): Promise<InstructionLog> {
  const deserialized = vaultTransactionCreateStruct.deserialize(ix);
  assertWarn(
    accounts[programIdx].toBase58() === KNOWN_PROGRAMS.squadAddress.toBase58(),
    "❗ Multisig transactions should use squad program."
  );

  const txIdx = (await squadUtils.multisigTransactionIndex()) + 1n;
  const txPda = squadUtils.txPda(Number(txIdx));

  book[txPda.toBase58()] = `tx-${txIdx}`;

  assertWarnAllKnown(accounts, book);
  assertWarn(
    txPda.toBase58() === accounts[accountIdxs[1]].toBase58(),
    "❗ Transaction in the create vault tx should be equal to the next index tx pda."
  );

  const multisig = getNameFromBook(book, accounts[accountIdxs[0]]);
  const transaction = getNameFromBook(book, accounts[accountIdxs[1]]);
  const creator = getNameFromBook(book, accounts[accountIdxs[2]]);
  const msg = transactionMessageBeet.deserialize(
    Buffer.from(deserialized[0].args.transactionMessage)
  )[0];

  const msgAccounts = msg.accountKeys;
  const inner: InstructionLog[] = [];

  for (const innerIx of msg.instructions) {
    inner.push(
      await parseIx(
        connection,
        squadUtils,
        book,
        Buffer.from(innerIx.data),
        innerIx.programIdIndex,
        innerIx.accountIndexes,
        msgAccounts
      )
    );
  }

  return {
    type: "CreateVaultTx",
    details: { multisig, transaction, creator },
    inner,
  };
}

function parseCreateConfigTx(
  _connection: Connection,
  _squadUtils: SquadsMultisig,
  book: Record<string, string>,
  ix: Buffer,
  programIdx: number,
  _accountIdxs: number[],
  accounts: PublicKey[]
): Promise<InstructionLog> {
  assertWarn(
    accounts[programIdx].toBase58() === KNOWN_PROGRAMS.squadAddress.toBase58(),
    "❗ Multisig transactions should use squad program."
  );

  const deserialized = configTransactionCreateStruct.deserialize(ix);
  const actions = deserialized[0].args.actions;

  const actionsLog = parseMultisigConfigActions(book, actions);

  return Promise.resolve({
    type: "CreateConfigTx",
    details: {},
    inner: [actionsLog],
  });
}

async function parseExecuteConfigTx(
  connection: Connection,
  squadUtils: SquadsMultisig,
  book: Record<string, string>,
  _ix: Buffer,
  programIdx: number,
  accountIdxs: number[],
  accounts: PublicKey[]
): Promise<InstructionLog> {
  assertWarn(
    accounts[programIdx].toBase58() === KNOWN_PROGRAMS.squadAddress.toBase58(),
    "❗ Multisig transactions should use squad program."
  );

  assertWarnAllKnown(accounts, book);

  const multisig = getNameFromBook(book, accounts[accountIdxs[0]]);
  const member = getNameFromBook(book, accounts[accountIdxs[1]]);
  const proposal = getNameFromBook(book, accounts[accountIdxs[2]]);
  const transaction = getNameFromBook(book, accounts[accountIdxs[3]]);

  const proposalAccount = await Proposal.fromAccountAddress(
    connection,
    accounts[accountIdxs[2]]
  );
  const txId = proposalAccount.transactionIndex;

  const inner = [
    await parseTxAtIndex(connection, squadUtils, book, Number(txId)),
  ];

  return {
    type: "ExecuteConfigTx",
    details: { multisig, member, proposal, transaction, txId },
    inner,
  };
}
function parseTransferAuthority(
  _connection: Connection,
  _squadUtils: SquadsMultisig,
  book: Record<string, string>,
  _ix: Buffer,
  programIdx: number,
  accountIdxs: number[],
  accounts: PublicKey[]
): Promise<InstructionLog> {
  assertWarnAllKnown(accounts, book);
  assertWarn(
    accountIdxs.length === 3,
    `❗ Transfer Authority expects 3 accounts got: ${accountIdxs.length}`
  );
  assertWarn(
    accounts[programIdx].toBase58() ===
      SYSTEM_ACCOUNTS.bpfLoaderUpgradeable.toBase58(),
    "❗ Transfer Authority should use bpfLoaderUpgradeable program."
  );

  const of = getNameFromBook(book, accounts[accountIdxs[0]]);
  const from = getNameFromBook(book, accounts[accountIdxs[1]]);
  const to = getNameFromBook(book, accounts[accountIdxs[2]]);

  return Promise.resolve({
    type: "TransferAuthority",
    details: { of, from, to },
  });
}

async function parseExecuteVaultTx(
  connection: Connection,
  squadUtils: SquadsMultisig,
  book: Record<string, string>,
  ix: Buffer,
  programIdx: number,
  accountIdxs: number[],
  accounts: PublicKey[]
): Promise<InstructionLog> {
  const _deserialized = vaultTransactionExecuteStruct.deserialize(ix);

  assertWarn(
    accounts[programIdx].toBase58() === KNOWN_PROGRAMS.squadAddress.toBase58(),
    "❗ Multisig transactions should use squad program."
  );
  const proposalAccount = await Proposal.fromAccountAddress(
    connection,
    accounts[accountIdxs[1]]
  );
  const txId = proposalAccount.transactionIndex;

  const txPda = squadUtils.txPda(Number(txId));
  book[squadUtils.proposalPda(Number(txId)).toBase58()] =
    `proposal-${txId.toString()}`;
  book[txPda.toBase58()] = `tx-${txId.toString()}`;

  const multisig = getNameFromBook(book, accounts[accountIdxs[0]]);
  const proposal = getNameFromBook(book, accounts[accountIdxs[1]]);
  const transaction = getNameFromBook(book, accounts[accountIdxs[2]]);
  const member = getNameFromBook(book, accounts[accountIdxs[3]]);

  assertWarnAllKnown(accounts, book);

  const inner = [
    await parseTxAtIndex(connection, squadUtils, book, Number(txId)),
  ];

  return {
    type: "ExecuteVaultTx",
    details: { multisig, proposal, transaction, member, txId },
    inner,
  };
}

async function parseMultisigProposeTx(
  connection: Connection,
  squadUtils: SquadsMultisig,
  book: Record<string, string>,
  ix: Buffer,
  programIdx: number,
  accountIdxs: number[],
  accounts: PublicKey[]
): Promise<InstructionLog> {
  const deserialized = proposalCreateStruct.deserialize(ix);
  const txId = deserialized[0].args.transactionIndex;

  assertWarn(
    accountIdxs.length === 2,
    "❗ Propose tx expects only proposal account and multisig account"
  );
  assertWarn(
    accounts[programIdx].toBase58() === KNOWN_PROGRAMS.squadAddress.toBase58(),
    "❗ Multisig transactions should use squad program."
  );
  const proposalPda = squadUtils.proposalPda(Number(txId));
  const proposalFromTx = accounts[accountIdxs[1]];
  book[squadUtils.proposalPda(Number(txId)).toBase58()] =
    `proposal-${txId.toString()}`;

  assertWarn(
    proposalFromTx.toBase58() === proposalPda.toBase58(),
    `❗ Proposal account for ${txId.toString()} should be ${proposalPda.toBase58()} but is ${proposalFromTx.toBase58()}.`
  );

  const multisig = getNameFromBook(book, accounts[accountIdxs[0]]);
  const proposal = getNameFromBook(book, accounts[accountIdxs[1]]);

  const inner = [
    await parseTxAtIndex(connection, squadUtils, book, Number(txId)),
  ];

  return {
    type: "MultisigProposeTx",
    details: { txId, proposal, multisig },
    inner,
  };
}

function parseCloseBufferTx(
  _connection: Connection,
  _squadUtils: SquadsMultisig,
  book: Record<string, string>,
  _ix: Buffer,
  programIdx: number,
  accountIdxs: number[],
  accounts: PublicKey[]
): Promise<InstructionLog> {
  assertWarn(
    accounts[programIdx].toBase58() ===
      SYSTEM_ACCOUNTS.bpfLoaderUpgradeable.toBase58(),
    "❗ Close buffer transaction should use bpfLoaderUpgradeable program"
  );
  assertWarn(
    accountIdxs.length === 3,
    `❗ Close buffer transaction expects 3 accounts got: ${accountIdxs.length}`
  );
  assertWarnAllKnown(accounts, book);

  const buffer = getNameFromBook(book, accounts[accountIdxs[0]]);
  const recipient = getNameFromBook(book, accounts[accountIdxs[1]]);
  const bufferAuthority = getNameFromBook(book, accounts[accountIdxs[2]]);

  return Promise.resolve({
    type: "CloseBuffer",
    details: { buffer, recipient, bufferAuthority },
  });
}

function parseVerifyProgram(
  _connection: Connection,
  _squadUtils: SquadsMultisig,
  book: Record<string, string>,
  _ix: Buffer,
  programIdx: number,
  accountIdxs: number[],
  accounts: PublicKey[]
): Promise<InstructionLog> {
  assertWarn(
    accounts[programIdx].toBase58() === KNOWN_PROGRAMS.otterVerify.toBase58(),
    "❗ Verify should use otterVerify program"
  );
  book[accounts[accountIdxs[0]].toBase58()] = "otter-build-params";

  const buildParams = getNameFromBook(book, accounts[accountIdxs[0]]);
  const authority = getNameFromBook(book, accounts[accountIdxs[1]]);
  const program = getNameFromBook(book, accounts[accountIdxs[2]]);

  return Promise.resolve({
    type: "VerifyProgram",
    details: { buildParams, authority, program },
  });
}

export function matchInstruction(data: Buffer) {
  const fullBufferMatches: [
    Buffer,
    (
      connection: Connection,
      squadUtils: SquadsMultisig,
      book: Record<string, string>,
      ix: Buffer,
      programIdx: number,
      accountIdxs: number[],
      accounts: PublicKey[]
    ) => Promise<InstructionLog>,
  ][] = [
    [Buffer.from(INSTRUCTION_BOOK.upgradeTx), parseUpgradeTx],
    [Buffer.from(INSTRUCTION_BOOK.transferAuthority), parseTransferAuthority],
    [Buffer.from(INSTRUCTION_BOOK.closeBuffer), parseCloseBufferTx],
  ];

  const fullBufferMatched = fullBufferMatches.find(
    ([expected, _]) => data.length == expected.length && expected.equals(data)
  );

  if (fullBufferMatched) {
    return fullBufferMatched[1];
  }

  if (data.length < 8) {
    throw new Error("unknown transaction");
  }

  const discriminator = data.subarray(0, 8);

  const discriminatorMatches: [
    Buffer,
    (
      connection: Connection,
      squadUtils: SquadsMultisig,
      book: Record<string, string>,
      ix: Buffer,
      programIdx: number,
      accountIdxs: number[],
      accounts: PublicKey[]
    ) => Promise<InstructionLog>,
  ][] = [
    [Buffer.from(INSTRUCTION_BOOK.multisigApproveTx), parseMultisigApproveTx],
    [Buffer.from(INSTRUCTION_BOOK.multisigCreateConfigTx), parseCreateConfigTx],
    [Buffer.from(INSTRUCTION_BOOK.multisigCreateVaultTx), parseCreateVaultTx],
    [
      Buffer.from(INSTRUCTION_BOOK.multisigExecuteConfigTx),
      parseExecuteConfigTx,
    ],
    [Buffer.from(INSTRUCTION_BOOK.multisigExecuteVaultTx), parseExecuteVaultTx],
    [Buffer.from(INSTRUCTION_BOOK.multisigProposeTx), parseMultisigProposeTx],
    [Buffer.from(INSTRUCTION_BOOK.verifyProgram), parseVerifyProgram],
  ];

  const matched = discriminatorMatches.find(([expected, _]) =>
    expected.equals(discriminator)
  );

  if (matched) {
    return matched[1];
  }

  throw new Error("unknown transaction");
}
