import { RedstoneCommon } from "@redstone-finance/utils";
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

import "dotenv/config";
import { makeConnection, readKeypair } from "../utils";
import {
  LEDGER_ACCOUNT,
  PROGRAM_ID,
  SQUAD_ADDRESS,
  TEMP_AUTHORITY,
} from "./config";
import { makeSolana, SolanaLedgerSigner } from "./ledger-utils";
import { SquadsMultisig } from "./multi-sig-utils";
import { createSetUpgradeAuthority } from "./transfer-ownership";

type FunctionType = "createVaultTx" | "propose" | "approve" | "execute";

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
  squad: SquadsMultisig,
  transactionIdx: bigint,
  functionType: FunctionType,
  newAuthorityAddress: PublicKey | undefined,
  programId: PublicKey | undefined
) {
  const messageArr = [
    `Performing step '${functionType}' of setting new authority as multisig: ${squad.multisigAddress().toBase58()}.`,
    `Transaction idx: ${transactionIdx}.`,
  ];
  if (newAuthorityAddress !== undefined) {
    messageArr.push(`New authority: ${newAuthorityAddress.toBase58()}.`);
  }
  if (programId !== undefined) {
    messageArr.push(`ProgramId: ${programId.toBase58()}.`);
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

async function promptNewAuthority(functionType: FunctionType) {
  if (functionType !== "createVaultTx") {
    return undefined;
  }

  const newAuthorityPrompt = await prompts({
    type: "text",
    name: "newAuthorityAddress",
    message: "New authority address",
    initial: TEMP_AUTHORITY.toBase58(),
  });

  return new PublicKey(newAuthorityPrompt.newAuthorityAddress as string);
}

async function promptProgramId(functionType: FunctionType) {
  if (functionType !== "createVaultTx") {
    return undefined;
  }

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
async function handleCreateVaultTx(
  connection: Connection,
  squad: SquadsMultisig,
  transactionIdx: bigint,
  newAuthorityAddress: PublicKey,
  signer: Signer,
  programId: PublicKey
) {
  const member = await signerPublicKey(signer);
  const setAuthorityIx = createSetUpgradeAuthority(
    programId,
    squad.vaultPda(),
    newAuthorityAddress
  );
  const ix = await squad.createVaultTransaction(
    member,
    setAuthorityIx,
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
  newAuthorityAddress: PublicKey | undefined,
  signer: Signer,
  programId: PublicKey | undefined
) {
  const tx = await (async () => {
    switch (functionType) {
      case "createVaultTx":
        return await handleCreateVaultTx(
          connection,
          squad,
          transactionIdx,
          newAuthorityAddress!,
          signer,
          programId!
        );
      case "approve":
        return await handleApprove(connection, squad, transactionIdx, signer);
      case "propose":
        return await handlePropose(connection, squad, transactionIdx, signer);
      case "execute":
        return await handleExecute(connection, squad, transactionIdx, signer);
    }
  })();

  return await connection.sendTransaction(tx);
}

async function main() {
  const url = RedstoneCommon.getFromEnv("URL");
  const connection = makeConnection(url);

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

  const squadAddressPrompt = await prompts({
    type: "text",
    name: "multisigAddress",
    message: "MultisigPda address",
    initial: SQUAD_ADDRESS.toBase58(),
  });
  const squadAddress = new PublicKey(
    squadAddressPrompt.multisigAddress as string
  );

  const newAuthorityAddress = await promptNewAuthority(functionType);
  const programId = await promptProgramId(functionType);

  const squadUtils = new SquadsMultisig(squadAddress, connection);
  const transactionIdx = await promptTxIdx(squadUtils, functionType);

  const signer = await promptSigner();

  await promptConfirm(
    squadUtils,
    transactionIdx,
    functionType,
    newAuthorityAddress,
    programId
  );

  const txSignature = await handleAction(
    connection,
    squadUtils,
    functionType,
    transactionIdx,
    newAuthorityAddress,
    signer,
    programId
  );

  console.log(`Transaction submitted: ${txSignature}`);
}

void main();
