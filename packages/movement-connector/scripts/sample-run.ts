import { Network } from "@aptos-labs/ts-sdk";
import { getSignersForDataServiceId } from "@redstone-finance/oracles-smartweave-contracts";
import { ContractParamsProvider, sampleRun } from "@redstone-finance/sdk";
import { MovementPricesContractConnector } from "../src";
import { MovementPriceFeedContractConnector } from "../src/price_feed/MovementPriceFeedContractConnector";
import { getEnvParams, readObjectAddress } from "./deploy-utils";
import { makeAptos } from "./utils";

async function main() {
  const paramsProvider = new ContractParamsProvider({
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    dataPackagesIds: ["ETH", "BTC"],
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });
  const {
    account,
    network = Network.LOCAL,
    url,
  } = getEnvParams(["CONTRACT_NAME"]);
  const aptos = makeAptos(network, url);

  const { contractAddress, objectAddress } = readObjectAddress(
    "price_adapter",
    network
  );
  const { contractAddress: feedAddress } = readObjectAddress(
    "price_feed",
    network
  );
  const packageObjectAddress = contractAddress.toString();
  const priceAdapterObjectAddress = objectAddress!.toString();
  console.log(
    `CONTRACT: ${packageObjectAddress}; OBJECT: ${priceAdapterObjectAddress}; FEED: ${feedAddress.toString()}`
  );

  const moveContractConnector = new MovementPricesContractConnector(
    aptos,
    { packageObjectAddress, priceAdapterObjectAddress },
    account
  );

  const ethPriceFeedConnector = new MovementPriceFeedContractConnector(
    aptos,
    feedAddress.toString()
  );
  await sampleRun(paramsProvider, moveContractConnector, ethPriceFeedConnector);
}

void main();
