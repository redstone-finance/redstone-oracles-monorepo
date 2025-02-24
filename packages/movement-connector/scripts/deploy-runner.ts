import { Network } from "@aptos-labs/ts-sdk";
import "dotenv/config";
import {
  deploy,
  getEnvParams,
  getPriceAdapterObjectAddress,
  PRICE_ADAPTER,
  PRICE_FEED,
  readDepAddresses,
  REDSTONE_SDK,
} from "./deploy-utils";
import { makeAptos } from "./utils";

async function main() {
  const {
    contractName,
    account,
    network = Network.LOCAL,
    url,
  } = getEnvParams();
  if (!account) {
    throw new Error("Account not derived");
  }
  const aptos = makeAptos(network, url);

  switch (contractName) {
    case REDSTONE_SDK:
      await deploy(aptos, account, contractName, network);
      break;

    case PRICE_ADAPTER:
      await deploy(
        aptos,
        account,
        contractName,
        network,
        readDepAddresses([REDSTONE_SDK], network)
      );
      break;

    case PRICE_FEED: {
      const depsAddresses = readDepAddresses(
        [REDSTONE_SDK, PRICE_ADAPTER],
        network
      );
      depsAddresses["price_adapter_object_address"] =
        getPriceAdapterObjectAddress(depsAddresses[PRICE_ADAPTER]!);
      await deploy(aptos, account, contractName, network, depsAddresses);
      break;
    }
  }
}

void main();
