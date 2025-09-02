import { Contract } from "@stellar/stellar-sdk";
import { makeKeypair, StellarClientBuilder } from "../../src";
import { AdminAdapter } from "../../src/AdminAdapter";
import { loadAdapterId, readNetwork, readUrl } from "../utils";
import { MULTISIG_ADDRESS } from "./consts";

async function changeAdminTx() {
  const keypair = makeKeypair();
  const adapterId = loadAdapterId();

  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();

  const admin = new AdminAdapter(client, new Contract(adapterId));

  const tx = await admin.changeAdminTx(MULTISIG_ADDRESS, keypair.publicKey());

  console.log(tx.toEnvelope().toXDR("hex"));
}

void changeAdminTx();
