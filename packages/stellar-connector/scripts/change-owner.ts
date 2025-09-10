import { PriceAdapterStellarContractConnector, StellarClientBuilder, makeKeypair } from "../src";
import { MULTISIG_ADDRESS } from "./ledger/consts";
import { loadContractId, readNetwork, readUrl } from "./utils";

async function changeOwner(contractId = loadContractId()) {
  const keypair = makeKeypair();

  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();

  const connector = new PriceAdapterStellarContractConnector(client, contractId, keypair);

  const adapter = await connector.getAdapter();

  const hash = await adapter.changeOwner(MULTISIG_ADDRESS);
  console.log(`change owner tx: ${hash}`);
}

void changeOwner();
