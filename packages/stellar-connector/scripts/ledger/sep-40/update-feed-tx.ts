import { FeedMapping } from "../../../src/sep-40-types";
import { MULTISIG_ADDRESS } from "../../consts";
import { loadSep40Id } from "../../utils";
import { printTx } from "../print-tx";

const FEE_STROOPS = "1000";

const FEED_MAPPING: FeedMapping = {
  feed: "BTC",
  asset: { tag: "Other", symbol: "BTC" },
  decimals: 8,
};

async function updateFeedTx(contractId = loadSep40Id()) {
  await printTx(
    contractId,
    (adapter) => adapter.updateFeedTx(MULTISIG_ADDRESS, FEED_MAPPING, FEE_STROOPS),
    "sep40"
  );
}

void updateFeedTx();
