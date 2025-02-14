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
  const { contractName, account, network, url } = getEnvParams();
  const aptos = makeAptos(network, url);

  switch (contractName) {
    case REDSTONE_SDK:
      await deploy(aptos, account, contractName);
      break;

    case PRICE_ADAPTER:
      await deploy(
        aptos,
        account,
        contractName,
        readDepAddresses([REDSTONE_SDK])
      );
      break;

    case PRICE_FEED: {
      const depsAddresses = readDepAddresses([REDSTONE_SDK, PRICE_ADAPTER]);
      depsAddresses["price_adapter_object_address"] =
        getPriceAdapterObjectAddress(depsAddresses[PRICE_ADAPTER]!);
      await deploy(aptos, account, contractName, depsAddresses);
      break;
    }
  }
}

void main();
