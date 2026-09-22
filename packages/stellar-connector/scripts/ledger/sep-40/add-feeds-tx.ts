import { Address, Asset, Networks } from "@stellar/stellar-sdk";
import { FeedMapping } from "../../../src/sep-40-types";
import { MULTISIG_ADDRESS } from "../../consts";
import { loadSep40Id } from "../../utils";
import { printTx } from "../print-tx";

const FEE_STROOPS = "1000";

const contractAddressForAsset = (
  code: string,
  issuer?: string,
  networkPassphrase = Networks.PUBLIC
) => {
  return Address.fromString(new Asset(code, issuer).contractId(networkPassphrase));
};

const FEED_MAPPINGS: FeedMapping[] = [
  {
    feed: "USDe",
    asset: {
      tag: "Stellar",
      address: contractAddressForAsset(
        "USDE",
        "GDJ5BNU5NN6NQ54D7OX6NQTUYNBZ42CAT33QGM5BIQ2QIYADAC5ICH47"
      ),
    },
    decimals: 8,
  },
  {
    feed: "sUSDe",
    asset: {
      tag: "Stellar",
      address: contractAddressForAsset(
        "SUSDE",
        "GDJ5BNU5NN6NQ54D7OX6NQTUYNBZ42CAT33QGM5BIQ2QIYADAC5ICH47"
      ),
    },
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
