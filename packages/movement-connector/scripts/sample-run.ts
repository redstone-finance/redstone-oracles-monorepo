import { Network } from "@aptos-labs/ts-sdk";
import { getSignersForDataServiceId } from "@redstone-finance/oracles-smartweave-contracts";
import { ContractParamsProvider, sampleRun } from "@redstone-finance/sdk";
import { TRANSACTION_DEFAULT_CONFIG } from "../src";
import { MovementPricesContractConnector } from "../src/MovementPricesContractConnector";
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
  const packageObjectAddress = contractAddress.toString();
  const priceAdapterObjectAddress = objectAddress.toString();

  const moveContractConnector: MovementPricesContractConnector =
    new MovementPricesContractConnector(
      aptos,
      { packageObjectAddress, priceAdapterObjectAddress },
      account,
      TRANSACTION_DEFAULT_CONFIG
    );

  await sampleRun(paramsProvider, moveContractConnector);
}

void main();
