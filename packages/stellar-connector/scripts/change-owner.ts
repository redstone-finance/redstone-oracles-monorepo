import {
  PriceAdapterStellarContractConnector,
  StellarClientBuilder,
  makeKeypair,
} from "../src";
import { MULTISIG_ADDRESS } from "./ledger/consts";
import { loadAdapterId, readNetwork, readUrl } from "./utils";

async function changeOwner() {
  const keypair = makeKeypair();
  const adapterId = loadAdapterId();

  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();

  const connector = new PriceAdapterStellarContractConnector(
    client,
    adapterId,
    keypair
  );

  const adapter = await connector.getAdapter();

  const hash = await adapter.changeOwner(MULTISIG_ADDRESS);
  console.log(`change owner tx: ${hash}`);
}

void changeOwner();
