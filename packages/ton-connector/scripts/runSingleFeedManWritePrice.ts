import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { NetworkProvider } from "@ton/blueprint";
import { BlueprintTonNetwork } from "../src";
import { config } from "../src/config";
import { loadAddress } from "../src/deploy";
import { TonSingleFeedManContractConnector } from "../src/single-feed-man/TonSingleFeedManContractConnector";
import { TonSingleFeedMan } from "../wrappers/TonSingleFeedMan";

export async function run(provider: NetworkProvider) {
  const connector = new TonSingleFeedManContractConnector(
    new BlueprintTonNetwork(provider, config),
    await loadAddress(TonSingleFeedMan.getName())
  );
  const contract = await connector.getAdapter();

  const authenticatedGateways = RedstoneCommon.getRequiredAuthenticatedGatewaysFromEnv();

  const paramsProvider = new ContractParamsProvider({
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 4,
    dataPackagesIds: ["ETH"],
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
    authenticatedGateways,
  });

  console.log(await contract.writePriceFromPayloadToContract(paramsProvider));

  await connector.waitForTransaction("");

  console.log(await contract.readPriceAndTimestampFromContract());
}
