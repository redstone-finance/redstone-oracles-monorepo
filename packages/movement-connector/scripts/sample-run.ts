import { Network } from "@aptos-labs/ts-sdk";
import { getSignersForDataServiceId } from "@redstone-finance/oracles-smartweave-contracts";
import { ContractParamsProvider, sampleRun } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { z } from "zod";
import { makeAptosVariables, MovementNetworkSchema } from "../src";
import { MovementPricesContractConnector } from "../src/MovementPricesContractConnector";

async function main() {
  const network = RedstoneCommon.getFromEnv("NETWORK", MovementNetworkSchema);
  const packageAddress = RedstoneCommon.getFromEnv(
    "PACKAGE_ADDRESS",
    z.optional(z.string())
  );
  const privateKey = RedstoneCommon.getFromEnv(
    "PRIVATE_KEY",
    z.optional(z.string())
  );

  const paramsProvider = new ContractParamsProvider({
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 2,
    dataPackagesIds: ["LBTC", "BTC", "ETH"],
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  const aptosVariables = makeAptosVariables(
    network as Network,
    packageAddress,
    privateKey
  );

  const moveContractConnector: MovementPricesContractConnector =
    new MovementPricesContractConnector(
      aptosVariables.client,
      aptosVariables.account,
      aptosVariables.packageObjectAddress
    );

  await sampleRun(paramsProvider, moveContractConnector);
}

void main();
