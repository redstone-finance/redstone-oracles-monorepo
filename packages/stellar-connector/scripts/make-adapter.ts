import { Contract } from "@stellar/stellar-sdk";
import {
  makeKeypair,
  StellarClientBuilder,
  StellarContractAdapter,
  StellarTxDeliveryMan,
} from "../src";
import { readNetwork, readUrl } from "./utils";

export function makeAdapter(contractId: string) {
  const keypair = makeKeypair();
  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();

  const txDeliveryMan = new StellarTxDeliveryMan(client, keypair);

  return new StellarContractAdapter(client, new Contract(contractId), txDeliveryMan);
}
