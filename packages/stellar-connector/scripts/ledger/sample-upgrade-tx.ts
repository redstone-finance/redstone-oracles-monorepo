import { MULTISIG_ADDRESS } from "../consts";
import { getSampleUpgradeTx } from "../sample-upgrade";
import { loadContractId } from "../utils";

const FEE_STROOPS = "1000";

async function sampleUpgrade(contractId = loadContractId()) {
  const { ops, wasmHash } = await getSampleUpgradeTx(contractId);

  const tx = await ops.upgradeTx(MULTISIG_ADDRESS, wasmHash, FEE_STROOPS);

  console.log(tx.toEnvelope().toXDR("hex"));
}

void sampleUpgrade();
