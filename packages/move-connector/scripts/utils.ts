import {
  Account,
  Aptos,
  AptosConfig,
  Network,
  Serializer,
  SimpleTransaction,
} from "@aptos-labs/ts-sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import prompts from "prompts";
import { z } from "zod";
import { isAptos, isMovement } from "./config";
import { getEnvNetwork } from "./get-env";
import { AptosLedger, signTx } from "./ledger/ledger-utils";

const DEFAULT_TESTNET_RPC_URL =
  "https://aptos.testnet.bardock.movementlabs.xyz/v1";
const DEFAULT_TESTNET_FAUCET_URL =
  "https://faucet.testnet.bardock.movementnetwork.xyz";

export function makeAptos(
  network: Network = Network.CUSTOM,
  rpcUrl?: string,
  faucetUrl?: string
): Aptos {
  const config = new AptosConfig({
    network,
    fullnode:
      rpcUrl ??
      RedstoneCommon.getFromEnv("RPC_URL", z.string().url().optional()) ??
      DEFAULT_TESTNET_RPC_URL,
    faucet: faucetUrl ?? DEFAULT_TESTNET_FAUCET_URL,
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
  tx: SimpleTransaction,
  accountId = 0
) {
  const auth = await signTx(aptosLedger, tx, accountId);

  const result = await aptos.transaction.submit.simple({
    transaction: tx,
    senderAuthenticator: auth,
  });

  console.log(result);

  await aptos.waitForTransaction({ transactionHash: result.hash });

  return result;
}

export async function promptForConfirmation() {
  const response = await prompts(
    [
      {
        type: "toggle",
        name: "confirm",
        message: "Proceed?",
        initial: false,
        active: "yes",
        inactive: "no",
      },
    ],
    {
      onCancel: () => {
        console.log("\n❌ Operation aborted by user.");
        process.exit(1);
      },
    }
  );

  if (!response.confirm) {
    console.log("Operation cancelled.");
    process.exit(0);
  }
}

export function getCurrencySymbol() {
  const network = getEnvNetwork();

  if (isAptos(network)) {
    return "APT";
  }

  if (isMovement(network)) {
    return "MOVE";
  }

  return "CUSTOM-NETWORK_CURRENCY";
}
