import { Contract } from "@stellar/stellar-sdk";
import { makeKeypair, StellarClientBuilder, StellarContractAdapter } from "../../src";
import { loadContractId, readNetwork, readUrl } from "../utils";
import { MULTISIG_ADDRESS } from "./consts";

const FEE_STROOPS = 1000;

async function changeOwnerTx(contractId = loadContractId()) {
  const keypair = makeKeypair();

  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();

  const adapter = new StellarContractAdapter(client, new Contract(contractId));
  const tx = await adapter.changeOwnerTx(MULTISIG_ADDRESS, keypair.publicKey(), FEE_STROOPS);

  console.log(tx.toEnvelope().toXDR("hex"));
}

void changeOwnerTx();
