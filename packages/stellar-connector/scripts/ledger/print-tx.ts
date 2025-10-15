import { Contract, Transaction } from "@stellar/stellar-sdk";
import { StellarClientBuilder, StellarContractAdapter } from "../../src";
import { readNetwork, readUrl } from "../utils";

export async function printTx(
  contractId: string,
  txCreator: (adapter: StellarContractAdapter) => Promise<Transaction>
) {
  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();

  const adapter = new StellarContractAdapter(client, new Contract(contractId));
  const tx = await txCreator(adapter);

  console.log(tx.toEnvelope().toXDR("hex"));
}
