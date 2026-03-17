import { ForwardCompatibleWriteContractAdapter, sampleRun } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { provider } from "./common/provider";
import { readProxyContractId } from "./common/read-proxy-contract-id";
import { connectPricesContract } from "./prices/prices-contract-test-utils";

const IS_LOCAL = true as boolean;

async function main() {
  const paramsProvider = new ContractParamsProvider({
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 5,
    dataPackagesIds: ["ETH", "BTC"],
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  const pricesConnector = await connectPricesContract(
    readProxyContractId(),
    false,
    await provider(IS_LOCAL)
  );

  const connector = await ForwardCompatibleWriteContractAdapter.fromConnector(pricesConnector);

  await sampleRun(paramsProvider, connector, await pricesConnector.getAdapter());
}

void main();
