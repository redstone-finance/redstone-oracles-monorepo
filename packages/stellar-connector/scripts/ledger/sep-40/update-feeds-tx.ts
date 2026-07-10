import { FeedMapping } from "../../../src/sep-40-types";
import { MULTISIG_ADDRESS } from "../../consts";
import { loadSep40Id } from "../../utils";
import { printTx } from "../print-tx";

const FEE_STROOPS = "1000";

const FEED_MAPPINGS: FeedMapping[] = [
  {
    feed: "BTC",
    asset: { tag: "Other", symbol: "BTC" },
    decimals: 8,
  },
];

async function updateFeedsTx(contractId = loadSep40Id()) {
  await printTx(
    contractId,
    (adapter) => adapter.updateFeedsTx(MULTISIG_ADDRESS, FEED_MAPPINGS, FEE_STROOPS),
    "sep40"
  );
}

void updateFeedsTx();
