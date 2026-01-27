import {
  makeCantonClients,
  PricesCantonContractConnector,
} from "@redstone-finance/canton-connector";
import { deconstructNetworkId } from "@redstone-finance/utils";
import { PartialRelayerConfig } from "./partial-relayer-config";

export const getCantonContractConnector = (relayerConfig: PartialRelayerConfig) => {
  const { adapterContractAddress, rpcUrls, networkId } = relayerConfig;
  const { chainId } = deconstructNetworkId(networkId);

  if (rpcUrls.length !== 1) {
    throw new Error("Only single rpc url is supported");
  }

  const [url] = rpcUrls;

  const { client, updateClient } = makeCantonClients(url, chainId);

  return new PricesCantonContractConnector(client, updateClient, adapterContractAddress);
};
