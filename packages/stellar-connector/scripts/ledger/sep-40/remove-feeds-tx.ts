import { MULTISIG_ADDRESS } from "../../consts";
import { loadSep40Id } from "../../utils";
import { printTx } from "../print-tx";

const FEE_STROOPS = "1000";

const FEEDS = ["BTC"];

async function removeFeedsTx(contractId = loadSep40Id()) {
  await printTx(
    contractId,
    (adapter) => adapter.removeFeedsTx(MULTISIG_ADDRESS, FEEDS, FEE_STROOPS),
    "sep40"
  );
}

void removeFeedsTx();
