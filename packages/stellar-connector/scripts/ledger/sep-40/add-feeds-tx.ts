import { RedstoneCommon } from "@redstone-finance/utils";
import { Address } from "@stellar/stellar-sdk";
import { FeedMapping } from "../../../src/sep-40-types";
import { MULTISIG_ADDRESS } from "../../consts";
import { loadSep40Id } from "../../utils";
import { printTx } from "../print-tx";

const FEE_STROOPS = "1000";
const TIMEOUT_SEC = RedstoneCommon.hourToSecs(24);

const FEED_MAPPINGS: FeedMapping[] = [
  {
    feed: "earnUSDC_FUNDAMENTAL/USD",
    asset: {
      tag: "Stellar",
      address: Address.fromString("CCL3WITWFFXIHV2I52ECV5DPIEOFSTU3PBPR53ILPLF2IP5KHECXRUTY"),
    },
    decimals: 8,
  },
];

async function addFeedsTx(contractId = loadSep40Id()) {
  await printTx(
    contractId,
    (adapter) => adapter.addFeedsTx(MULTISIG_ADDRESS, FEED_MAPPINGS, FEE_STROOPS, TIMEOUT_SEC),
    "sep40"
  );
}

void addFeedsTx();
