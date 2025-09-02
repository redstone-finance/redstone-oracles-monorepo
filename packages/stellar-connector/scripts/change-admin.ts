import {
  PriceAdapterStellarContractConnector,
  StellarClientBuilder,
  makeKeypair,
} from "../src";
import { MULTISIG_ADDRESS } from "./ledger/consts";
import { loadAdapterId, readNetwork, readUrl } from "./utils";

async function changeAdmin() {
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

  const hash = await adapter.changeAdmin(MULTISIG_ADDRESS);
  console.log(`change admin tx: ${hash}`);
}

void changeAdmin();
