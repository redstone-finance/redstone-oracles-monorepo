import { getSignersForDataServiceId } from "@redstone-finance/oracles-smartweave-contracts";
import { ContractParamsProvider, sampleRun } from "@redstone-finance/sdk";
import { MovementPricesContractConnector } from "../src/MovementPricesContractConnector";
import { getEnvParams, readObjectAddress } from "./deploy-utils";
import { makeAptos } from "./utils";

async function main() {
  const paramsProvider = new ContractParamsProvider({
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 2,
    dataPackagesIds: ["LBTC", "BTC", "ETH"],
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });
  const { account, network, url } = getEnvParams(["CONTRACT_NAME"]);
  const aptos = makeAptos(network, url);
  const { contractAddress, objectAddress } = readObjectAddress("price_adapter");
  console.log(
    "CONTRACT:",
    contractAddress.toString(),
    "OBJECT:",
    objectAddress.toString()
  );
  const packageObjectAddress = contractAddress.toString();
  const priceAdapterObjectAddress = objectAddress.toString();

  const moveContractConnector: MovementPricesContractConnector =
    new MovementPricesContractConnector(
      aptos,
      { packageObjectAddress, priceAdapterObjectAddress },
      account
    );

  await sampleRun(paramsProvider, moveContractConnector);
}

void main();
