import {
  Account,
  AccountAddress,
  Aptos,
  generateRawTransaction,
  HexInput,
  SimpleTransaction,
  SingleKeyAccount,
  TransactionPayloadMultiSig,
} from "@aptos-labs/ts-sdk";
import { MultiSigTxBuilder } from "./multisig";
import { MovementPackageTxBuilder } from "./package";
import { handleTx } from "./utils";

export async function setupTestMultiSig(
  aptos: Aptos,
  creator: Account
): Promise<{ builder: MultiSigTxBuilder; multiSigAddress: AccountAddress }> {
  const threshold: number = 1;
  const randomAccount = Account.generate();
  const builder = new MultiSigTxBuilder(
    aptos,
    creator.accountAddress,
    [randomAccount.accountAddress],
    threshold
  );
  console.log(
    `Setting up new multisig, from ${randomAccount.accountAddress.toString()} ${creator.accountAddress.toString()}`
  );
  const multiSigAddress = await builder.nextMultiSignatureAddress();
  console.log(`Multisig account : ${multiSigAddress.toString()}`);
  const tx = await builder.createMultiSigTx();

  await handleTx(aptos, tx, creator);

  return {
    builder,
    multiSigAddress,
  };
}

export async function handleMultiSig(
  aptos: Aptos,
  multiSigBuilder: MultiSigTxBuilder,
  payload: TransactionPayloadMultiSig,
  signer: Account,
  txId: number = 1
) {
  const tx = await multiSigBuilder.proposeTx(signer.accountAddress, payload);
  await handleTx(aptos, tx, signer);

  const accept = await multiSigBuilder.acceptTx(
    signer.accountAddress,
    payload.multiSig.multisig_address,
    txId
  );
  await handleTx(aptos, accept, signer);

  const rawTransaction = await generateRawTransaction({
    aptosConfig: aptos.transaction.build.config,
    sender: signer.accountAddress,
    payload: payload,
  });

  const executeTx = new SimpleTransaction(rawTransaction);
  await handleTx(aptos, executeTx, signer);
}

/// 1. Setup accounts, compile code
/// 2. As a main account publish package
/// 3. Setup multisig with main account and threshold 1
/// 4. Transfer package to the multisig
/// 5. As a multisig upgrade the package.
export async function multiSig(arg: {
  aptos: Aptos;
  account: SingleKeyAccount;
  builder: MovementPackageTxBuilder;
  objectAddress: AccountAddress;
  metadataBytes: HexInput;
  byteCode: HexInput[];
  priceAdapterObjectAddress: AccountAddress;
}) {
  const {
    aptos,
    account,
    builder,
    objectAddress,
    metadataBytes,
    byteCode,
    priceAdapterObjectAddress,
  } = arg;
  const { builder: multiSigBuilder, multiSigAddress } = await setupTestMultiSig(
    aptos,
    account
  );

  console.log("Transfer object to multisig");
  const transferTx = await builder.objectTransferFunction(
    account.accountAddress,
    objectAddress,
    multiSigAddress
  );
  await handleTx(aptos, transferTx, account);

  console.log("Upgrading package as multisig");
  const upgradeTx = await builder.objectUpgradeTxPayload(
    multiSigAddress,
    objectAddress,
    metadataBytes,
    byteCode
  );
  await handleMultiSig(aptos, multiSigBuilder, upgradeTx, account);

  console.log("deployed under:");
  console.log({
    objectAddress: objectAddress.toString(),
    multiSigAddress: multiSigAddress.toString(),
    priceAdapterObjectAddress: priceAdapterObjectAddress.toString(),
  });
}
