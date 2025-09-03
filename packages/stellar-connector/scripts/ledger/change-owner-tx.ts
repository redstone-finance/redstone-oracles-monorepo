import { Contract } from "@stellar/stellar-sdk";
import {
  makeKeypair,
  StellarClientBuilder,
  UpgradableAdapter,
} from "../../src";
import { loadAdapterId, readNetwork, readUrl } from "../utils";
import { MULTISIG_ADDRESS } from "./consts";

async function changeOwnerTx() {
  const keypair = makeKeypair();
  const adapterId = loadAdapterId();

  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();

  const adapter = new UpgradableAdapter(client, new Contract(adapterId));
  const tx = await adapter.changeOwnerTx(MULTISIG_ADDRESS, keypair.publicKey());

  console.log(tx.toEnvelope().toXDR("hex"));
}

void changeOwnerTx();
