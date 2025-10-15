import { makeAdapter } from "./make-adapter";
import { loadContractId } from "./utils";

async function cancelOwnershipTransfer(contractId = loadContractId()) {
  const adapter = makeAdapter(contractId);

  const hash = await adapter.cancelOwnershipTransfer();
  console.log(`cancel tx: ${hash}`);
}

void cancelOwnershipTransfer();
