import { RedstoneCommon } from "@redstone-finance/utils";
import { MULTISIG_ADDRESS } from "../../consts";
import { loadSep40Id } from "../../utils";
import { printTx } from "../print-tx";

const FEE_STROOPS = "1000";

const RESOLUTION = RedstoneCommon.hourToSecs(12);

async function setResolutionTx(contractId = loadSep40Id()) {
  await printTx(
    contractId,
    (adapter) => adapter.setResolutionTx(MULTISIG_ADDRESS, RESOLUTION, FEE_STROOPS),
    "sep40"
  );
}

void setResolutionTx();
