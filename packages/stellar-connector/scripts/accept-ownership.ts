import { Contract } from "@stellar/stellar-sdk";
import {
  StellarClientBuilder,
  StellarContractOps,
  StellarOperationSender,
  makeKeypair,
} from "../src";
import { StellarSigner } from "../src/stellar/StellarSigner";
import { loadContractId, readNetwork, readUrl } from "./utils";

async function acceptOwnership(contractId = loadContractId()) {
  const keypair = makeKeypair();

  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();

  const operationSender = new StellarOperationSender(new StellarSigner(keypair), client);
  const adapter = new StellarContractOps(client, new Contract(contractId), operationSender);

  const hash = await adapter.acceptOwnership();
  console.log(`accept tx: ${hash}`);
}

void acceptOwnership();
