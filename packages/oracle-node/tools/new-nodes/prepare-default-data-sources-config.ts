import prompts from "prompts";
import ArweaveService from "../../src/arweave/ArweaveService";

const BROADCASTER_URLS = [
  "https://api.redstone.finance",
  "https://vwx3eni8c7.eu-west-1.awsapprunner.com",
  "https://container-service-1.dv9sai71f4rsq.eu-central-1.cs.amazonlightsail.com",
];

interface NodeInfo {
  arweaveAddress: string;
  evmAddress: string;
}

main();

async function main() {
  const { dataFeedId } = await prompts({
    type: "text",
    message: "Provide data feed id",
    initial: "redstone-avalanche-prod",
    name: "dataFeedId",
  });

  const nodes = await getNodesForDataFeed(dataFeedId);

  const sources = [];
  for (const node of nodes) {
    for (const broadcasterUrl of BROADCASTER_URLS) {
      sources.push({
        type: "cache-layer",
        url: broadcasterUrl,
        providerId: node.arweaveAddress,
        evmSignerAddress: node.evmAddress,
      });
    }
  }

  // Output sources JSON
  console.log(JSON.stringify(sources, null, 2));
}

async function getNodesForDataFeed(dataFeedId: string): Promise<NodeInfo[]> {
  const arweaveService = new ArweaveService();
  const state = await arweaveService.getOracleRegistryContractState();
  return Object.entries(state.nodes)
    .filter(([, nodeDetails]) => nodeDetails.dataFeedId === dataFeedId)
    .map(([arweaveAddress, { evmAddress }]) => ({
      arweaveAddress,
      evmAddress,
    }));
}
