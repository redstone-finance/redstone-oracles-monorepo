import {
  makeKeypair,
  PriceAdapterStellarContractConnector,
  StellarClientBuilder,
} from "@redstone-finance/stellar-connector";
import { PartialRelayerConfig } from "./partial-relayer-config";

export const getStellarContractConnector = (relayerConfig: PartialRelayerConfig) => {
  const {
    adapterContractAddress,
    privateKey,
    rpcUrls,
    networkId,
    gasLimit,
    gasMultiplier,
    maxTxSendAttempts,
    expectedTxDeliveryTimeInMS,
  } = relayerConfig;

  const client = new StellarClientBuilder()
    .withNetworkId(networkId)
    .withRpcUrls(rpcUrls)
    .withQuarantineEnabled()
    .build();

  const txDeliveryManConfig = {
    gasLimit,
    gasMultiplier,
    maxTxSendAttempts,
    expectedTxDeliveryTimeInMS,
  };

  return new PriceAdapterStellarContractConnector(
    client,
    adapterContractAddress,
    makeKeypair(privateKey),
    txDeliveryManConfig
  );
};
