import {
  ContractParamsProvider,
  getSignersForDataServiceId,
  sampleRun,
} from "@redstone-finance/sdk";
import { makeAptosAccount, MovePricesContractConnector } from "../src";
import { MovePriceFeedContractConnector } from "../src/price_feed/MovePriceFeedContractConnector";
import { PRICE_ADAPTER, PRICE_FEED } from "./contract-name-enum";
import { readObjectAddress } from "./deploy-utils";
import { makeAptos } from "./utils";

async function main() {
  const paramsProvider = new ContractParamsProvider({
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    dataPackagesIds: ["ETH"],
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });
  const aptos = makeAptos();
  const account = makeAptosAccount();

  const { contractAddress, objectAddress } = readObjectAddress(PRICE_ADAPTER);
  const { contractAddress: feedAddress } = readObjectAddress(PRICE_FEED);
  const packageObjectAddress = contractAddress.toString();
  const priceAdapterObjectAddress = objectAddress!.toString();
  console.log(
    `CONTRACT: ${packageObjectAddress}; OBJECT: ${priceAdapterObjectAddress}; FEED: ${feedAddress.toString()}`
  );

  const moveContractConnector = new MovePricesContractConnector(
    aptos,
    { packageObjectAddress, priceAdapterObjectAddress },
    account
  );

  const ethPriceFeedConnector = new MovePriceFeedContractConnector(
    aptos,
    feedAddress.toString()
  );
  await sampleRun(paramsProvider, moveContractConnector, ethPriceFeedConnector);
}

void main();
