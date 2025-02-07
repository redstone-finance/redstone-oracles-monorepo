import {
  Account,
  AccountAddress,
  Aptos,
  AptosConfig,
  createObjectAddress,
  HexInput,
  Network,
  Serializer,
  SimpleTransaction,
} from "@aptos-labs/ts-sdk";
import fs from "fs";
import { AptosLedger, signTx } from "./ledger-utils";

export function getPackageBytesToPublish(moduleFile: string) {
  const jsonData = JSON.parse(fs.readFileSync(moduleFile, "utf8")) as {
    args: { value: HexInput | HexInput[] }[];
  };

  const metadataBytes = jsonData.args[0].value as HexInput;
  const bytecode = jsonData.args[1].value as HexInput[];

  return { metadataBytes, bytecode };
}

export function makeAptos(
  network: Network = Network.CUSTOM,
  rpcUrl: string = "https://aptos.testnet.porto.movementlabs.xyz/v1"
): Aptos {
  const config = new AptosConfig({
    network,
    fullnode: rpcUrl,
  });
  return new Aptos(config);
}

function objectSeed(sequenceNumber: number) {
  const serializer = new Serializer();
  serializer.serializeStr("aptos_framework::object_code_deployment");
  serializer.serializeU64(sequenceNumber);

  return serializer.toUint8Array();
}

export async function objectAddressForDeployment(
  aptos: Aptos,
  address: AccountAddress
) {
  const info = await aptos.account.getAccountInfo({ accountAddress: address });
  return createObjectAddress(
    address,
    objectSeed(+info.sequence_number + 1)
  ).toString();
}

export function getPriceAdapterObjectAddress(creator: AccountAddress) {
  return createObjectAddress(creator, "RedStonePriceAdapter");
}

export async function signAndSubmit(
  aptos: Aptos,
  transaction: SimpleTransaction,
  signer: Account
) {
  return await aptos.transaction.signAndSubmitTransaction({
    signer,
    transaction,
  });
}

export async function handleTx(
  aptos: Aptos,
  transaction: SimpleTransaction,
  signer: Account
) {
  const pendingResponse = await signAndSubmit(aptos, transaction, signer);

  console.log(`TransactionHash: ${pendingResponse.hash}`);
  return await aptos.waitForTransaction({
    transactionHash: pendingResponse.hash,
  });
}

export async function handleTxAsLedger(
  aptos: Aptos,
  aptosLedger: AptosLedger,
  tx: SimpleTransaction
) {
  const auth = await signTx(aptosLedger, tx);

  const result = await aptos.transaction.submit.simple({
    transaction: tx,
    senderAuthenticator: auth,
  });

  console.log(result);
}
