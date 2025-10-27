import { Contract } from "@stellar/stellar-sdk";
import {
  makeKeypair,
  StellarClientBuilder,
  StellarContractAdapter,
  StellarOperationSender,
} from "../src";
import { StellarSigner } from "../src/stellar/StellarSigner";
import { readNetwork, readUrl } from "./utils";

export function makeAdapter(contractId: string) {
  const keypair = makeKeypair();
  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();

  const operationSender = new StellarOperationSender(new StellarSigner(keypair), client);
  const adapter = new StellarContractAdapter(client, new Contract(contractId), operationSender);

  return adapter;
}
