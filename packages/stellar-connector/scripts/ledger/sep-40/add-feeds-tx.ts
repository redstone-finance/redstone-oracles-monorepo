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
    feed: "GILTS",
    asset: {
      tag: "Stellar",
      address: contractAddressForAsset(
        "GILTS",
        "GCRYUGD5NVARGXT56XEZI5CIFCQETYHAPQQTHO2O3IQZTHDH4LATMYWC"
      ),
    },
    decimals: 8,
  },
  {
    feed: "USDY",
    asset: {
      tag: "Stellar",
      address: contractAddressForAsset(
        "USDY",
        "GAJMPX5NBOG6TQFPQGRABJEEB2YE7RFRLUKJDZAZGAD5GFX4J7TADAZ6"
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
