import { BASE_FEE, Keypair, Operation, rpc, TransactionBuilder } from "@stellar/stellar-sdk";
import { makeKeypair, StellarRpcClient } from "../../src";
import { StellarSigner } from "../../src/stellar/StellarSigner";
import { makeServer } from "../utils";
import { INITIAL_ACCOUNT_AMOUNT, MULTISIG_SIGNERS, MULTISIG_TRESHOLD } from "./consts";

async function createMultisigAccount(
  server: rpc.Server,
  targetAccountKeypair: Keypair,
  signerPublicKeys: string[],
  threshold: number
): Promise<string> {
  const client = new StellarRpcClient(server);

  const targetAccount = await server.getAccount(targetAccountKeypair.publicKey());

  const configTransactionBuilder = new TransactionBuilder(targetAccount, {
    fee: BASE_FEE,
    networkPassphrase: (await server.getNetwork()).passphrase,
  }).addOperation(
    Operation.setOptions({
      masterWeight: 0, // targetAccountKeypair have no longer power
      lowThreshold: threshold,
      medThreshold: threshold,
      highThreshold: threshold,
    })
  );

  signerPublicKeys.forEach((signerKey) => {
    configTransactionBuilder.addOperation(
      Operation.setOptions({
        signer: {
          ed25519PublicKey: signerKey,
          weight: 1,
        },
      })
    );
  });

  const configTransaction = configTransactionBuilder.setTimeout(300).build();
  configTransaction.sign(targetAccountKeypair);

  const configResult = await server.sendTransaction(configTransaction);
  await client.waitForTx(configResult.hash);

  return configResult.hash;
}

async function main() {
  const server = makeServer();
  const payer = makeKeypair();
  const sourceKeypair = Keypair.random();

  const client = new StellarRpcClient(server);

  // we need to fund account before we can set settings
  console.log(
    `Creations hash:`,
    await client.createAccountWithFunds(
      new StellarSigner(payer),
      sourceKeypair.publicKey(),
      INITIAL_ACCOUNT_AMOUNT
    )
  );

  const transactionHash = await createMultisigAccount(
    server,
    sourceKeypair,
    MULTISIG_SIGNERS,
    MULTISIG_TRESHOLD
  );

  console.log({
    multisigAccountId: sourceKeypair.publicKey(),
    transactionHash,
  });
}

void main().catch(console.error);
