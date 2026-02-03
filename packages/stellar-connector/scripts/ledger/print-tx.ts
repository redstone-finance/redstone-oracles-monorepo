import { Contract, Transaction } from "@stellar/stellar-sdk";
import { StellarClientBuilder, StellarContractOps } from "../../src";
import { readNetwork, readUrl } from "../utils";

export async function printTx(
  contractId: string,
  txCreator: (adapter: StellarContractOps) => Promise<Transaction>
) {
  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();

  const adapter = new StellarContractOps(client, new Contract(contractId));
  const tx = await txCreator(adapter);

  console.log(tx.toEnvelope().toXDR("hex"));
}
