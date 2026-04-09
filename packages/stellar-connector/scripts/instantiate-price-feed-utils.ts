import { Contract } from "@stellar/stellar-sdk";
import {
  StellarClient,
  StellarContractDeployer,
  StellarContractOps,
  StellarOperationSender,
} from "../src";
import * as XdrUtils from "../src/XdrUtils";
import { MULTISIG_ADDRESS, PRICE_FEED_WASM_HASH } from "./consts";
import { readPriceFeedId, savePriceFeedId } from "./utils";

export async function initPriceFeed(
  client: StellarClient,
  contractId: string,
  sender: StellarOperationSender,
  feedId: string
) {
  await new StellarContractOps(client, new Contract(contractId), sender).initContract(
    MULTISIG_ADDRESS,
    XdrUtils.stringToScVal(feedId)
  );

  console.log(`🚀 price feed for ${feedId} contract deployed at: ${contractId}`);

  savePriceFeedId(contractId, feedId);
}

export async function instantiatePriceFeed(
  deployer: StellarContractDeployer,
  client: StellarClient,
  sender: StellarOperationSender,
  feedId = readPriceFeedId(),
  adapterWasmHash = PRICE_FEED_WASM_HASH
) {
  const contractId = (
    await deployer.createContract(Buffer.from(adapterWasmHash, "hex"))
  ).toString();

  await initPriceFeed(client, contractId, sender, feedId);
}
