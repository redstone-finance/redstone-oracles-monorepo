import { FeedMapping } from "../../../src/sep-40-types";
import { MULTISIG_ADDRESS } from "../../consts";
import { loadSep40Id } from "../../utils";
import { printTx } from "../print-tx";

const FEE_STROOPS = "1000";

const FEED_MAPPING: FeedMapping = {
  feed: "ABC",
  asset: { tag: "Other", symbol: "ABC" },
  decimals: 8,
};

async function addFeedTx(contractId = loadSep40Id()) {
  await printTx(
    contractId,
    (adapter) => adapter.addFeedTx(MULTISIG_ADDRESS, FEED_MAPPING, FEE_STROOPS),
    "sep40"
  );
}

void addFeedTx();
