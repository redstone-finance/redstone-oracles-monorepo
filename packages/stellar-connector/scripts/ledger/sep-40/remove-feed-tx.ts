import { MULTISIG_ADDRESS } from "../../consts";
import { loadSep40Id } from "../../utils";
import { printTx } from "../print-tx";

const FEE_STROOPS = "1000";

const FEED = "BTC";

async function removeFeedTx(contractId = loadSep40Id()) {
  await printTx(
    contractId,
    (adapter) => adapter.removeFeedTx(MULTISIG_ADDRESS, FEED, FEE_STROOPS),
    "sep40"
  );
}

void removeFeedTx();
