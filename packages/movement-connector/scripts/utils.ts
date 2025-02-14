import {
  Account,
  Aptos,
  AptosConfig,
  Network,
  Serializer,
  SimpleTransaction,
} from "@aptos-labs/ts-sdk";
import { AptosLedger, signTx } from "./ledger-utils";

export function makeAptos(
  network: Network = Network.CUSTOM,
  rpcUrl: string = "https://aptos.testnet.porto.movementlabs.xyz/v1",
  faucetUrl?: string
): Aptos {
  const config = new AptosConfig({
    network,
    fullnode: rpcUrl,
    faucet: faucetUrl,
  });
  return new Aptos(config);
}

export function objectSeed(sequenceNumber: number) {
  const serializer = new Serializer();
  serializer.serializeStr("aptos_framework::object_code_deployment");
  serializer.serializeU64(sequenceNumber);

  return serializer.toUint8Array();
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
