import { MULTISIG_ADDRESS } from "./consts";
import { makeContractOps } from "./make-adapter";
import { loadContractId } from "./utils";

async function changeOwner(newOwner = MULTISIG_ADDRESS, contractId = loadContractId()) {
  const ops = makeContractOps(contractId);

  const hash = await ops.changeOwner(newOwner);
  console.log(`change owner tx: ${hash}`);
}

void changeOwner();
