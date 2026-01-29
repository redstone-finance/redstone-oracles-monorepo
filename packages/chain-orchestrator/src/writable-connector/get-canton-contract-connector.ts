import {
  CantonClientBuilder,
  CoreFactoryCantonContractConnector,
} from "@redstone-finance/canton-connector";
import { RedstoneCommon } from "@redstone-finance/utils";
import { PartialRelayerConfig } from "./partial-relayer-config";

export const getCantonContractConnector = (relayerConfig: PartialRelayerConfig) => {
  const { adapterContractAddress, rpcUrls, networkId, privateKey } = relayerConfig;

  const client = new CantonClientBuilder()
    .withRpcUrls(rpcUrls)
    .withNetworkId(networkId)
    .withPartyId(RedstoneCommon.getFromEnv("VIEWER_PARTY_ID"))
    .withDefaultAuth(privateKey)
    .build();

  return new CoreFactoryCantonContractConnector(client, adapterContractAddress);
};
