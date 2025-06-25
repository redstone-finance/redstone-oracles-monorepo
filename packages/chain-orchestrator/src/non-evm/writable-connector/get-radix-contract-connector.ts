import {
  DEFAULT_RADIX_CLIENT_CONFIG,
  PriceAdapterRadixContractConnector,
  RadixClientBuilder,
} from "@redstone-finance/radix-connector";
import { PartialRelayerConfig } from "./partial-relayer-config";

export const getRadixContractConnector = (
  relayerConfig: PartialRelayerConfig
) => {
  const {
    privateKey,
    adapterContractAddress,
    networkId,
    rpcUrls,
    gasLimit,
    gasMultiplier,
    maxTxSendAttempts,
    expectedTxDeliveryTimeInMS,
  } = relayerConfig;

  const clientConfig = {
    ...DEFAULT_RADIX_CLIENT_CONFIG,
    tipMultiplier: gasMultiplier ?? DEFAULT_RADIX_CLIENT_CONFIG.tipMultiplier,
    maxFeeXrd: gasLimit ?? DEFAULT_RADIX_CLIENT_CONFIG.maxFeeXrd,
    maxTxSendAttempts:
      maxTxSendAttempts ?? DEFAULT_RADIX_CLIENT_CONFIG.maxTxSendAttempts,
    maxTxWaitingTimeMs:
      expectedTxDeliveryTimeInMS ??
      DEFAULT_RADIX_CLIENT_CONFIG.maxTxWaitingTimeMs,
  };

  const client = new RadixClientBuilder()
    .withNetworkId(networkId)
    .withRpcUrls(rpcUrls)
    .withClientConfig(clientConfig)
    .withPrivateKey({ scheme: "secp256k1", value: privateKey })
    .build();

  return new PriceAdapterRadixContractConnector(client, adapterContractAddress);
};
