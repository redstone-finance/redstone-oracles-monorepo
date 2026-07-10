import { Contract, Transaction } from "@stellar/stellar-sdk";
import { StellarClientBuilder, StellarContractOps } from "../../src";
import { StellarSep40ContractOps } from "../../src/adapters/StellarSep40ContractOps";
import { readNetwork, readUrl } from "../utils";

type AdapterKind = "base" | "sep40";
type AdapterFor<K extends AdapterKind> = K extends "sep40"
  ? StellarSep40ContractOps
  : StellarContractOps;

export async function printTx<K extends AdapterKind = "base">(
  contractId: string,
  txCreator: (adapter: AdapterFor<K>) => Promise<Transaction>,
  kind?: K
) {
  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .withMulticall()
    .build();
  const contract = new Contract(contractId);
  const adapter = (
    kind === "sep40"
      ? new StellarSep40ContractOps(client, contract)
      : new StellarContractOps(client, contract)
  ) as AdapterFor<K>;

  const tx = await txCreator(adapter);
  console.log(tx.toEnvelope().toXDR("hex"));
}
