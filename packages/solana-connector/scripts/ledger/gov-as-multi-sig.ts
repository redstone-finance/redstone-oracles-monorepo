import {
  AddressLookupTableAccount,
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import prompts from "prompts";

import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import path from "path";
import { PROGRAM_SO_FILE } from "../consts";
import { makeConnection, readDeployDir, readKeypair } from "../utils";
import {
  LEDGER_ACCOUNT,
  PROGRAM_ID,
  SQUAD_ADDRESS,
  TEMP_AUTHORITY,
} from "./config";
import { makeSolana, SolanaLedgerSigner } from "./ledger-utils";
import { SquadsMultisig } from "./multi-sig-utils";
import { createSetUpgradeAuthority } from "./transfer-ownership";
import {
  checkUpgradeTransaction,
  createUpgradeInstruction,
} from "./upgrade-from-buffer";

type FunctionType = "createVaultTx" | "propose" | "approve" | "execute";
type InstructionType =
  | {
      type: "set-authority";
      newAuthorityAddress: PublicKey;
      programId: PublicKey;
    }
  | {
      type: "upgrade-from-buffer";
      bufferAccount: PublicKey;
      spillAccount: PublicKey;
      programId: PublicKey;
    };

type Signer =
  | {
      type: "local";
      signer: Keypair;
    }
  | {
      type: "ledger";
      signer: SolanaLedgerSigner;
    };

async function signerPublicKey(signer: Signer) {
  if (signer.type === "local") {
    return signer.signer.publicKey;
  }
  return (await signer.signer.getPublicKey()).ed;
}

async function sign(signer: Signer, tx: VersionedTransaction) {
  if (signer.type === "local") {
    return tx.sign([signer.signer]);
  }
  await signer.signer.signTransaction(tx);
}

async function promptInstructionType(functionType: FunctionType) {
  if (functionType !== "createVaultTx" && functionType !== "approve") {
    return undefined;
  }

  const type = (
    await prompts({
      type: "select",
      name: "selectInstruction",
      message: "Select instruction to create or approve",
      choices: [
        { title: "set-new-authority", value: "set-new-authority" },
        { title: "upgrade-from-buffer", value: "upgrade-from-buffer" },
      ],
    })
  ).selectInstruction as "set-new-authority" | "upgrade-from-buffer";

  const programId = await promptProgramId();

  switch (type) {
    case "set-new-authority":
      return { ...(await promptNewAuthority()), programId } as InstructionType;
    case "upgrade-from-buffer":
      return {
        ...(await promptUpgradeFromBuffer()),
        programId,
      } as InstructionType;
  }
}

async function promptUpgradeFromBuffer() {
  const bufferAccount = await prompts({
    type: "text",
    name: "bufferAccount",
    message: "Buffer account with new program data address",
  });
  const spillAccount = await prompts({
    type: "text",
    name: "spillAccount",
    message: "Account which will be reimbursed for the rent",
  });

  return {
    type: "upgrade-from-buffer",
    bufferAccount: new PublicKey(bufferAccount.bufferAccount as string),
    spillAccount: new PublicKey(spillAccount.spillAccount as string),
  };
}

async function promptTxIdx(squad: SquadsMultisig, functionType: FunctionType) {
  const currentTransactionIdx = await squad.multisigTransactionIndex();
  if (functionType === "createVaultTx") {
    return currentTransactionIdx + 1n;
  }

  const prompt = await prompts({
    type: "number",
    name: "transactionIdx",
    message: `Transaction index to '${functionType}'`,
    initial: Number(currentTransactionIdx),
  });

  return BigInt(prompt.transactionIdx as number);
}

async function promptSigner(): Promise<Signer> {
  const useLedger = (
    await prompts({
      type: "confirm",
      name: "useLedger",
      message: "Use ledger as signer?",
    })
  ).useLedger as boolean;

  console.log(useLedger);

  if (useLedger) {
    return {
      type: "ledger",
      signer: await makeSolana(LEDGER_ACCOUNT),
    };
  }

  const signer = readKeypair();
  return {
    type: "local",
    signer,
  };
}

async function promptConfirm(
  connection: Connection,
  squad: SquadsMultisig,
  transactionIdx: bigint,
  functionType: FunctionType,
  instructionType: InstructionType | undefined
) {
  if (
    functionType === "approve" &&
    instructionType?.type === "upgrade-from-buffer"
  ) {
    await checkUpgradeTransaction(
      connection,
      squad,
      await squad.txInfo(Number(transactionIdx)),
      instructionType.bufferAccount,
      path.join(readDeployDir(), PROGRAM_SO_FILE)
    );
  }

  const messageArr = [
    `Performing step '${functionType}' as multisig: ${squad.multisigAddress().toBase58()}.`,
    `Transaction idx: ${transactionIdx}.`,
  ];
  if (instructionType?.programId !== undefined) {
    messageArr.push(`ProgramId: ${instructionType.programId.toBase58()}.`);
  }
  messageArr.push(`Do you wish to continue?`);

  const perform = (
    await prompts({
      type: "confirm",
      name: "perform",
      message: messageArr.join("\n"),
    })
  ).perform as boolean;

  if (!perform) {
    console.log("aborting ...");
    process.exit(0);
  }
}

async function promptNewAuthority() {
  const newAuthorityPrompt = await prompts({
    type: "text",
    name: "newAuthorityAddress",
    message: "New authority address",
    initial: TEMP_AUTHORITY.toBase58(),
  });

  return {
    type: "set-authority",
    newAuthorityAddress: new PublicKey(
      newAuthorityPrompt.newAuthorityAddress as string
    ),
  };
}

async function promptProgramId() {
  const programIdPrompt = await prompts({
    type: "text",
    name: "programId",
    message: "Program id to set authority",
    initial: PROGRAM_ID.toBase58(),
  });

  return new PublicKey(programIdPrompt.programId as string);
}

async function getTx(
  connection: Connection,
  ix: TransactionInstruction,
  payer: PublicKey,
  addressLookupTableAccounts?: AddressLookupTableAccount[]
) {
  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions: [ix],
  }).compileToV0Message(addressLookupTableAccounts);

  return new VersionedTransaction(message);
}

function getInstruction(
  squad: SquadsMultisig,
  instructionType: InstructionType
) {
  if (instructionType.type === "set-authority") {
    return createSetUpgradeAuthority(
      instructionType.programId,
      squad.vaultPda(),
      instructionType.newAuthorityAddress
    );
  } else {
    return createUpgradeInstruction(
      squad.vaultPda(),
      instructionType.programId,
      instructionType.bufferAccount,
      instructionType.spillAccount
    );
  }
}

async function handleCreateVaultTx(
  connection: Connection,
  squad: SquadsMultisig,
  transactionIdx: bigint,
  instructionType: InstructionType,
  signer: Signer
) {
  const member = await signerPublicKey(signer);
  const innerIx = getInstruction(squad, instructionType);

  const ix = await squad.createVaultTransaction(
    member,
    innerIx,
    transactionIdx
  );

  const tx = await getTx(connection, ix, member);
  await sign(signer, tx);
  return tx;
}

async function handlePropose(
  connection: Connection,
  squad: SquadsMultisig,
  transactionIdx: bigint,
  signer: Signer
) {
  const member = await signerPublicKey(signer);
  const ix = await squad.propose(member, transactionIdx);

  const tx = await getTx(connection, ix, member);
  await sign(signer, tx);
  return tx;
}

async function handleApprove(
  connection: Connection,
  squad: SquadsMultisig,
  transactionIdx: bigint,
  signer: Signer
) {
  const member = await signerPublicKey(signer);
  const ix = await squad.approve(member, transactionIdx);

  const tx = await getTx(connection, ix, member);
  await sign(signer, tx);
  return tx;
}

async function handleExecute(
  connection: Connection,
  squad: SquadsMultisig,
  transactionIdx: bigint,
  signer: Signer
) {
  const member = await signerPublicKey(signer);
  const ixInfo = await squad.execute(member, transactionIdx);

  const tx = await getTx(
    connection,
    ixInfo.instruction,
    member,
    ixInfo.lookupTableAccounts
  );
  await sign(signer, tx);
  return tx;
}

async function handleAction(
  connection: Connection,
  squad: SquadsMultisig,
  functionType: FunctionType,
  transactionIdx: bigint,
  instructionType: InstructionType | undefined,
  signer: Signer
) {
  const tx = await (async () => {
    switch (functionType) {
      case "createVaultTx":
        return await handleCreateVaultTx(
          connection,
          squad,
          transactionIdx,
          instructionType!,
          signer
        );
      case "approve":
        return await handleApprove(connection, squad, transactionIdx, signer);
      case "propose":
        return await handlePropose(connection, squad, transactionIdx, signer);
      case "execute":
        return await handleExecute(connection, squad, transactionIdx, signer);
      default:
        return RedstoneCommon.throwUnsupportedParamError(functionType);
    }
  })();

  return await connection.sendTransaction(tx);
}

async function main() {
  const connection = makeConnection();

  const functionType = (
    await prompts({
      type: "select",
      name: "selectFunction",
      message: "Select function type",
      choices: [
        { title: "createVaultTx", value: "createVaultTx" },
        { title: "propose", value: "propose" },
        { title: "approve", value: "approve" },
        { title: "execute", value: "execute" },
      ],
    })
  ).selectFunction as FunctionType;

  const instructionData = await promptInstructionType(functionType);

  const squadAddressPrompt = await prompts({
    type: "text",
    name: "multisigAddress",
    message: "MultisigPda address",
    initial: SQUAD_ADDRESS.toBase58(),
  });
  const squadAddress = new PublicKey(
    squadAddressPrompt.multisigAddress as string
  );

  const squadUtils = new SquadsMultisig(squadAddress, connection);
  const transactionIdx = await promptTxIdx(squadUtils, functionType);

  const signer = await promptSigner();

  await promptConfirm(
    connection,
    squadUtils,
    transactionIdx,
    functionType,
    instructionData
  );

  const txSignature = await handleAction(
    connection,
    squadUtils,
    functionType,
    transactionIdx,
    instructionData,
    signer
  );

  console.log(`Transaction submitted: ${txSignature}`);
}

void main();
