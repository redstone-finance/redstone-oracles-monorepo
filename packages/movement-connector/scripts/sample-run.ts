import { getSignersForDataServiceId } from "@redstone-finance/oracles-smartweave-contracts";
import { ContractParamsProvider, sampleRun } from "@redstone-finance/sdk";
import { makeAptosAccount, MovementPricesContractConnector } from "../src";
import { MovementPriceFeedContractConnector } from "../src/price_feed/MovementPriceFeedContractConnector";
import { readObjectAddress } from "./deploy-utils";
import { makeAptos } from "./utils";

async function main() {
  const paramsProvider = new ContractParamsProvider({
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    dataPackagesIds: ["ETH", "BTC"],
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });
  const aptos = makeAptos();
  const account = makeAptosAccount();

  const { contractAddress, objectAddress } = readObjectAddress("price_adapter");
  const { contractAddress: feedAddress } = readObjectAddress("price_feed");
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
