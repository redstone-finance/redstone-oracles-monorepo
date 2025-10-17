import { loadContractId } from "../utils";
import { MULTISIG_ADDRESS } from "./consts";
import { printTx } from "./print-tx";

const FEE_STROOPS = "1000";

async function cancelOwnershipTransferTx(contractId = loadContractId()) {
  await printTx(contractId, (adapter) =>
    adapter.cancelOwnershipTransferTx(MULTISIG_ADDRESS, FEE_STROOPS)
  );
}

void cancelOwnershipTransferTx();
