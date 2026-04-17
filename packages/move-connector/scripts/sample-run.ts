import { ForwardCompatibleWriteContractAdapter, sampleRun } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { makeAptosAccount, MoveClientBuilder, MovePricesContractConnector } from "../src";
import { MovePriceFeedContractAdapter } from "../src/price_feed/MovePriceFeedContractAdapter";
import { PRICE_ADAPTER, PRICE_FEED } from "./contract-name-enum";
import { readObjectAddress } from "./deploy-utils";
import { getEnvNetworkEnum } from "./get-env";

async function main() {
  const paramsProvider = new ContractParamsProvider({
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    dataPackagesIds: ["ETH"],
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });
  const rpcUrls = RedstoneCommon.getFromEnv("RPC_URLS", z.array(z.url()).optional()) ?? [
    RedstoneCommon.getFromEnv("RPC_URL", z.url()),
  ];
  const client = MoveClientBuilder.getInstance("aptos")
    .withNetwork(getEnvNetworkEnum())
    .withRpcUrls(rpcUrls)
    .build();
  const account = makeAptosAccount();

  const { contractAddress, objectAddress } = readObjectAddress(PRICE_ADAPTER);
  const { contractAddress: feedAddress } = readObjectAddress(PRICE_FEED);
  const packageObjectAddress = contractAddress.toString();
  const priceAdapterObjectAddress = objectAddress!.toString();
  console.log(
    `CONTRACT: ${packageObjectAddress}; OBJECT: ${priceAdapterObjectAddress}; FEED: ${feedAddress.toString()}`
  );

  const moveContractConnector = new MovePricesContractConnector(
    client,
    { packageObjectAddress, priceAdapterObjectAddress },
    account
  );

  const adapter = await ForwardCompatibleWriteContractAdapter.fromConnector(moveContractConnector);
  const ethPriceFeedAdapter = new MovePriceFeedContractAdapter(client, feedAddress.toString());
  await sampleRun(paramsProvider, adapter, moveContractConnector, ethPriceFeedAdapter);
}

void main();
