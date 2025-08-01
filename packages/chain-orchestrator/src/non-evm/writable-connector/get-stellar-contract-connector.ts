import {
  makeKeypair,
  PriceAdapterStellarContractConnector,
  StellarClientBuilder,
} from "@redstone-finance/stellar-connector";
import { PartialRelayerConfig } from "./partial-relayer-config";

export const getStellarContractConnector = (
  relayerConfig: PartialRelayerConfig
) => {
  const { adapterContractAddress, privateKey, rpcUrls, networkId } =
    relayerConfig;

  const client = new StellarClientBuilder()
    .withNetworkId(networkId)
    .withRpcUrls(rpcUrls)
    .withQuarantineEnabled()
    .build();

  return new PriceAdapterStellarContractConnector(
    client,
    adapterContractAddress,
    makeKeypair(privateKey)
  );
};
