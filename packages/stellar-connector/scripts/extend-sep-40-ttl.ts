import { Contract } from "@stellar/stellar-sdk";
import { makeKeypair, StellarClientBuilder, StellarOperationSender } from "../src";
import { StellarSep40ContractOps } from "../src/adapters/StellarSep40ContractOps";
import { StellarSigner } from "../src/stellar/StellarSigner";
import { loadSep40Id, readNetwork, readUrl } from "./utils";

async function extendEntriesTtl(contractId = loadSep40Id()) {
  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();
  const keypair = makeKeypair();

  const sender = new StellarOperationSender(new StellarSigner(keypair), client);
  const adapter = new StellarSep40ContractOps(client, new Contract(contractId), sender);

  const result = await adapter.extendEntriesTtl();
  console.log(result);
}

void extendEntriesTtl();
