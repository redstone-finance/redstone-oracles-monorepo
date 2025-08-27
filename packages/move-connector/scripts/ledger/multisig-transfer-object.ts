import {
  AccountAddress,
  Aptos,
  generateRawTransaction,
  SimpleTransaction,
} from "@aptos-labs/ts-sdk";
import { getTransactionJsonPath, readAddress } from "../deploy-utils";
import { MovePackageTxBuilder } from "../package";
import { LEDGER_ACCOUNT_ID, MULTI_SIG_ADDRESS } from "./const";
import { executeAsLedger } from "./execute-as-ledger";
import { MultiSigTxBuilder } from "./MultiSigTxBuilder";

async function proposeTransfer(
  aptos: Aptos,
  sender: AccountAddress,
  receiver: AccountAddress,
  multiSigAddress: AccountAddress = AccountAddress.from(MULTI_SIG_ADDRESS)
) {
  const objectAddress = readAddress();

  console.log(
    `Transfering object ${objectAddress.toString()} from ${multiSigAddress.toString()} to ${receiver.toString()}`
  );

  const transferTx = await new MovePackageTxBuilder(
    aptos
  ).objectTransferFunctionMultisig(multiSigAddress, objectAddress, receiver);

  return await MultiSigTxBuilder.proposeTx(aptos, sender, transferTx);
}

async function executeTransfer(
  aptos: Aptos,
  sender: AccountAddress,
  receiver: AccountAddress,
  multiSigAddress: AccountAddress = AccountAddress.from(MULTI_SIG_ADDRESS)
) {
  const objectAddress = readAddress();

  console.log(
    `Transfering object ${objectAddress.toString()} from ${multiSigAddress.toString()} to ${receiver.toString()}`
  );

  const payload = await new MovePackageTxBuilder(
    aptos
  ).objectTransferFunctionMultisig(multiSigAddress, objectAddress, receiver);
  const rawTransaction = await generateRawTransaction({
    aptosConfig: aptos.transaction.build.config,
    sender,
    payload,
  });

  return new SimpleTransaction(rawTransaction);
}

async function main() {
  const receiver = AccountAddress.from(
    "0x6fa05391eeedc626ea98694c533099b7d0c28f825fbbae1df2347d923b534c68"
  );

  const args = process.argv.slice(2);
  const cmd = args[0];

  const tx = (() => {
    switch (cmd) {
      case "propose":
        return async (aptos: Aptos, signerAddress: AccountAddress) =>
          await proposeTransfer(aptos, signerAddress, receiver);
      case "execute":
        return async (aptos: Aptos, signerAddress: AccountAddress) =>
          await executeTransfer(aptos, signerAddress, receiver);
      default:
        throw new Error("Expected `propose` or `execute`");
    }
  })();

  const response = await executeAsLedger(tx, LEDGER_ACCOUNT_ID);

  if (cmd === "propose") {
    console.log(
      `Transaction ${response.hash} created;\n` +
        `Visit the explorer, find the '0x1::multisig_account::CreateTransaction' event's 'sequence_number'\n` +
        `and set 'TX_ID' value in consts.ts file and in the\n${getTransactionJsonPath()} file.`
    );
  }
}

void main();
