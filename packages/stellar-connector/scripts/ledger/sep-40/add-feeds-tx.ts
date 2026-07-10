import { FeedMapping } from "../../../src/sep-40-types";
import { MULTISIG_ADDRESS } from "../../consts";
import { loadSep40Id } from "../../utils";
import { printTx } from "../print-tx";

const FEE_STROOPS = "1000";

const FEED_MAPPINGS: FeedMapping[] = [
  {
    feed: "ABC",
    asset: { tag: "Other", symbol: "ABC" },
    decimals: 8,
  },
  {
    feed: "BCD",
    asset: { tag: "Other", symbol: "BCD" },
    decimals: 8,
  },
];

async function addFeedsTx(contractId = loadSep40Id()) {
  await printTx(
    contractId,
    (adapter) => adapter.addFeedsTx(MULTISIG_ADDRESS, FEED_MAPPINGS, FEE_STROOPS),
    "sep40"
  );
}

void addFeedsTx();
