import { NetworkId } from "@redstone-finance/utils";
import chalk from "chalk";
import { readSsmRpcUrls, RpcUrlsPerChain } from "./read-ssm-rpc-urls";

const compareRpcUrlSets = (
  set1: RpcUrlsPerChain,
  set2: RpcUrlsPerChain,
  setName1: string,
  setName2: string,
  skipNetworkIds: NetworkId[]
) => {
  for (const chain in set1) {
    const networkId = set1[chain].networkId;

    if (skipNetworkIds.includes(networkId)) {
      console.log(chalk.yellow(`Skipping chain ${chain} with networkId ${networkId}`));
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- add reason here, please
    if (!set2[chain]) {
      console.log(`${setName2} does not contain ${chain}`);
      continue;
    }

    const missingUrls = set1[chain].rpcUrls.filter((url) => !set2[chain].rpcUrls.includes(url));

    if (missingUrls.length > 0) {
      console.log("\n---------------------------------------------------------------------\n");
      console.error(chalk.red(`- Missing configuration for ${chain}`));
      console.log(`${setName1} for ${chain}:`);
      missingUrls.forEach((url) => {
        console.log(`${new URL(url).origin}`);
      });

      console.log(`${setName2} for ${chain}:`);
      set2[chain].rpcUrls.forEach((rpcUrl) => {
        console.log(`${new URL(rpcUrl).origin}`);
      });
    }
  }
};

const compareRpcUrls = async (
  readSsmRpcUrlsFunction: (isFallback: boolean) => Promise<RpcUrlsPerChain>,
  skipNetworkIds: NetworkId[]
) => {
  try {
    const mainRpcUrls = await readSsmRpcUrlsFunction(false);
    const fallbackRpcUrls = await readSsmRpcUrlsFunction(true);

    compareRpcUrlSets(
      mainRpcUrls,
      fallbackRpcUrls,
      "Main RPC URLs",
      "Fallback RPC URLs",
      skipNetworkIds
    );

    compareRpcUrlSets(
      fallbackRpcUrls,
      mainRpcUrls,
      "Fallback RPC URLs",
      "Main RPC URLs",
      skipNetworkIds
    );
  } catch (error) {
    console.error("Error fetching RPC URLs:", error);
  }
};

const skipNetworkIds: NetworkId[] = [];
void compareRpcUrls(readSsmRpcUrls, skipNetworkIds);
