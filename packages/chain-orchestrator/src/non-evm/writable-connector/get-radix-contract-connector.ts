import {
  PriceAdapterRadixContractConnector,
  RadixClientBuilder,
} from "@redstone-finance/radix-connector";
import { PartialRelayerConfig } from "./partial-relayer-config";

export const getRadixContractConnector = (
  relayerConfig: PartialRelayerConfig
) => {
  const { privateKey, adapterContractAddress, chainId, rpcUrls } =
    relayerConfig;

  const client = new RadixClientBuilder()
    .withNetworkId(chainId)
    .withRpcUrls(rpcUrls)
    .withPrivateKey({ scheme: "secp256k1", value: privateKey })
    .build();

  return new PriceAdapterRadixContractConnector(client, adapterContractAddress);
};
