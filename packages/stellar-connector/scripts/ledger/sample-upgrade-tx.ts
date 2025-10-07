import { getSampleUpgradeTx } from "../sample-upgrade";
import { loadContractId } from "../utils";
import { MULTISIG_ADDRESS } from "./consts";

const FEE_STROOPS = 1000;

async function sampleUpgrade(contractId = loadContractId()) {
  const { adapter, wasmHash } = await getSampleUpgradeTx(contractId);

  const tx = await adapter.upgradeTx(MULTISIG_ADDRESS, wasmHash, FEE_STROOPS);

  console.log(tx.toEnvelope().toXDR("hex"));
}

void sampleUpgrade();
