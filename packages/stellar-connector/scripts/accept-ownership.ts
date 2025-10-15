import { Contract } from "@stellar/stellar-sdk";
import {
  StellarClientBuilder,
  StellarContractAdapter,
  StellarTxDeliveryMan,
  makeKeypair,
} from "../src";
import { loadContractId, readNetwork, readUrl } from "./utils";

async function acceptOwnership(contractId = loadContractId()) {
  const keypair = makeKeypair();

  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();

  const txDeliveryMan = new StellarTxDeliveryMan(client, keypair);
  const adapter = new StellarContractAdapter(client, new Contract(contractId), txDeliveryMan);

  const hash = await adapter.acceptOwnership();
  console.log(`accept tx: ${hash}`);
}

void acceptOwnership();
