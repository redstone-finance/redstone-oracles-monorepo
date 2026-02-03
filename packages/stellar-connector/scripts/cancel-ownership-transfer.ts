import { makeContractOps } from "./make-adapter";
import { loadContractId } from "./utils";

async function cancelOwnershipTransfer(contractId = loadContractId()) {
  const ops = makeContractOps(contractId);

  const hash = await ops.cancelOwnershipTransfer();
  console.log(`cancel tx: ${hash}`);
}

void cancelOwnershipTransfer();
