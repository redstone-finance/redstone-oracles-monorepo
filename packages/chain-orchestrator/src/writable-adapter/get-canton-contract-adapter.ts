import {
  CantonClientBuilder,
  PricesCantonContractAdapter,
} from "@redstone-finance/canton-connector";
import { RedstoneCommon } from "@redstone-finance/utils";
import { PartialRelayerConfig } from "./partial-relayer-config";

export const getCantonContractAdapter = (relayerConfig: PartialRelayerConfig) => {
  const { adapterContractAddress, rpcUrls, networkId, privateKey } = relayerConfig;

  const client = new CantonClientBuilder()
    .withRpcUrls(rpcUrls)
    .withNetworkId(networkId)
    .withPartyId(RedstoneCommon.getFromEnv("VIEWER_PARTY_ID"))
    .withDefaultAuth(privateKey)
    .build();

  const updaterClient = new CantonClientBuilder()
    .withRpcUrls(rpcUrls)
    .withNetworkId(networkId)
    .withPartyId(RedstoneCommon.getFromEnv("UPDATER_PARTY_ID"))
    .withDefaultAuth(privateKey)
    .build();

  return new PricesCantonContractAdapter(client, updaterClient, adapterContractAddress);
};
