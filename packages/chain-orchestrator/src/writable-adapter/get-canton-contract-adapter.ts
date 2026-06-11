import {
  CANTON_CONTRACT_ADAPTER_DEFAULT_CONFIG,
  CantonClientBuilder,
  PricesCantonContractAdapter,
  readAdditionalPillViewers,
  readCantonPartyIds,
  readUseConstTrafficMeter,
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
    fallbackOffsetInMilliseconds,
    dataFeeds,
  } = relayerConfig;

  const client = new CantonClientBuilder()
    .withRpcUrls(rpcUrls)
    .withNetworkId(networkId)
    .withDefaultAuth(privateKey)
    .withQuarantineEnabled()
    .build();

  const { viewerPartyId, updaterPartyId } = readCantonPartyIds();

  return new PricesCantonContractAdapter(
    client,
    {
      ...CANTON_CONTRACT_ADAPTER_DEFAULT_CONFIG,
      viewerPartyId,
      updaterPartyId: RedstoneCommon.assertThenReturn(
        updaterPartyId,
        "Canton updater party id is required"
      ),
      additionalPillViewers: readAdditionalPillViewers(),
      adapterId: adapterContractAddress,
      maxTxSendAttempts:
        maxTxSendAttempts ?? CANTON_CONTRACT_ADAPTER_DEFAULT_CONFIG.maxTxSendAttempts,
      expectedTxDeliveryTimeInMs:
        expectedTxDeliveryTimeInMS ??
        CANTON_CONTRACT_ADAPTER_DEFAULT_CONFIG.expectedTxDeliveryTimeInMs,
      shouldAccumulateTraffic: fallbackOffsetInMilliseconds === 0,
      useConstTrafficMeter: readUseConstTrafficMeter(),
      totalFeedCount: dataFeeds.length,
    },
    adapterContractPackageId
  );
};
