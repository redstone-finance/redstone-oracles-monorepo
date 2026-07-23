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

const OLD_FEED_ID = "USDY";
const NEW_FEED_MAPPING: FeedMapping = {
  feed: "USDY_FUNDAMENTAL/USD",
  asset: {
    tag: "Stellar",
    address: contractAddressForAsset(
      "USDY",
      "GAJMPX5NBOG6TQFPQGRABJEEB2YE7RFRLUKJDZAZGAD5GFX4J7TADAZ6"
    ),
  },
  decimals: 8,
};

async function replaceFeedIdTx(contractId = loadSep40Id()) {
  await printTx(
    contractId,
    (adapter) =>
      adapter.replaceFeedIdTx(MULTISIG_ADDRESS, OLD_FEED_ID, NEW_FEED_MAPPING, FEE_STROOPS),
    "sep40"
  );
}

void replaceFeedIdTx();
