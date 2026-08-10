import {
  ContractParamsProvider,
  DataServiceIds,
  getSignersForDataServiceId,
} from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { NetworkProvider } from "@ton/blueprint";
import { BlueprintTonNetwork, TonPriceManager } from "../src";
import { config } from "../src/config";
import { loadAddress } from "../src/deploy";
import { TonPriceManagerContractConnector } from "../src/price-manager/TonPriceManagerContractConnector";

export async function run(provider: NetworkProvider) {
  const contract = await new TonPriceManagerContractConnector(
    new BlueprintTonNetwork(provider, config),
    await loadAddress(TonPriceManager.getName())
  ).getAdapter();

  const dataServiceId = (process.env["DATA_SERVICE_ID"] ??
    "redstone-primary-demo") as DataServiceIds;

  const paramsProvider = new ContractParamsProvider({
    dataServiceId,
    uniqueSignersCount: 1,
    dataPackagesIds: ["BTC", "ETH", "BNB", "AR", "AVAX", "CELO"],
    authorizedSigners: getSignersForDataServiceId(dataServiceId),
    authenticatedGateways: RedstoneCommon.getAuthenticatedGatewaysFromEnv(),
  });

  console.log(await contract.getPricesFromPayload(paramsProvider));
}
