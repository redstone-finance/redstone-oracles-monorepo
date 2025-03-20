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
    chainId,
    rpcUrls,
    gasLimit,
    gasMultiplier,
    maxTxSendAttempts,
    expectedTxDeliveryTimeInMS,
  } = relayerConfig;

  const clientConfig = DEFAULT_RADIX_CLIENT_CONFIG;
  clientConfig.tipMultiplier = gasMultiplier ?? clientConfig.tipMultiplier;
  clientConfig.maxFeeXrd = gasLimit ?? clientConfig.maxFeeXrd;
  clientConfig.maxTxSendAttempts =
    maxTxSendAttempts ?? clientConfig.maxTxSendAttempts;
  clientConfig.maxTxWaitingTimeMs =
    expectedTxDeliveryTimeInMS ?? clientConfig.maxTxWaitingTimeMs;

  const client = new RadixClientBuilder()
    .withNetworkId(chainId)
    .withRpcUrls(rpcUrls)
    .withClientConfig(clientConfig)
    .withPrivateKey({ scheme: "secp256k1", value: privateKey })
    .build();

  return new PriceAdapterRadixContractConnector(client, adapterContractAddress);
};
