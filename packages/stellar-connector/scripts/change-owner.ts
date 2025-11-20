import { MULTISIG_ADDRESS } from "./consts";
import { makeAdapter } from "./make-adapter";
import { loadContractId } from "./utils";

async function changeOwner(newOwner = MULTISIG_ADDRESS, contractId = loadContractId()) {
  const adapter = makeAdapter(contractId);

  const hash = await adapter.changeOwner(newOwner);
  console.log(`change owner tx: ${hash}`);
}

void changeOwner();
