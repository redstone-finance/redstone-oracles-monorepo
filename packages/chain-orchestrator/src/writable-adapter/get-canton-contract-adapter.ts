import {
  CANTON_CONTRACT_ADAPTER_DEFAULT_CONFIG,
  CantonClientBuilder,
  PricesCantonContractAdapter,
  readAdditionalPillViewers,
} from "@redstone-finance/canton-connector";
import { RedstoneCommon } from "@redstone-finance/utils";
import { PartialRelayerConfig } from "./partial-relayer-config";

export const getCantonContractAdapter = (relayerConfig: PartialRelayerConfig) => {
  const {
    adapterContractAddress,
    adapterContractPackageId,
    rpcUrls,
    networkId,
    privateKey,
    expectedTxDeliveryTimeInMS,
    maxTxSendAttempts,
  } = relayerConfig;

  const client = new CantonClientBuilder()
    .withRpcUrls(rpcUrls)
    .withNetworkId(networkId)
    .withDefaultAuth(privateKey)
    .build();

  return new PricesCantonContractAdapter(
    client,
    {
      ...CANTON_CONTRACT_ADAPTER_DEFAULT_CONFIG,
      viewerPartyId: RedstoneCommon.getFromEnv("VIEWER_PARTY_ID"),
      updaterPartyId: RedstoneCommon.getFromEnv("UPDATER_PARTY_ID"),
      additionalPillViewers: readAdditionalPillViewers(),
      adapterId: adapterContractAddress,
      maxTxSendAttempts:
        maxTxSendAttempts ?? CANTON_CONTRACT_ADAPTER_DEFAULT_CONFIG.maxTxSendAttempts,
      expectedTxDeliveryTimeInMs:
        expectedTxDeliveryTimeInMS ??
        CANTON_CONTRACT_ADAPTER_DEFAULT_CONFIG.expectedTxDeliveryTimeInMs,
    },
    adapterContractPackageId
  );
};
