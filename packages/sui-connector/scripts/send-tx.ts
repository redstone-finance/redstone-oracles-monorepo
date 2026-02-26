import { Transaction } from "@mysten/sui/transactions";
import "dotenv/config";
import { makeSuiClient, makeSuiKeypair, SuiNetworkName } from "../src";
import { makeBaseTx } from "./ledger/make-base-tx";
import { migrateTransaction } from "./ledger/migrate-object-version";

async function main(creator: (tx: Transaction, network: SuiNetworkName) => void) {
  const keypair = makeSuiKeypair();
  const { tx, network } = await makeBaseTx(creator, keypair.toSuiAddress());
  const client = makeSuiClient(network);

  const txBytes = await tx.build({ client });
  const { signature } = await keypair.signTransaction(txBytes);

  const simulationResult = await client.core.simulateTransaction({
    transaction: txBytes,
  });

  if (simulationResult.Transaction) {
    const result = await client.core.executeTransaction({
      transaction: txBytes,
      signatures: [signature],
      include: { effects: true },
    });

    console.log("Result: ", result);
  } else {
    console.log("Simulation failed: ", simulationResult);
  }
}

void main(migrateTransaction);
