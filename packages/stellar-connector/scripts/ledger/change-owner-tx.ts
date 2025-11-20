import { makeKeypair } from "../../src";
import { MULTISIG_ADDRESS } from "../consts";
import { loadContractId } from "../utils";
import { printTx } from "./print-tx";

const FEE_STROOPS = "1000";

async function changeOwnerTx(contractId = loadContractId()) {
  const keypair = makeKeypair();

  await printTx(contractId, (adapter) =>
    adapter.changeOwnerTx(MULTISIG_ADDRESS, keypair.publicKey(), FEE_STROOPS)
  );
}

void changeOwnerTx();
