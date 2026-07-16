import {
  makeSuiConfig,
  makeSuiKeypair,
  SuiClientBuilder,
  SuiWriteContractAdapter,
} from "@redstone-finance/sui-connector";
import { PartialRelayerConfig } from "./partial-relayer-config";
import { getRelayerRpcMetricReporter } from "./rpc-metric-reporter";

export const getSuiContractAdapter = (relayerConfig: PartialRelayerConfig) => {
  const {
    privateKey,
    rpcUrls,
    adapterContractAddress,
    networkId,
    gasLimit,
    adapterContractPackageId,
    gasMultiplier,
    maxTxSendAttempts,
    expectedTxDeliveryTimeInMS,
  } = relayerConfig;
  if (!adapterContractPackageId) {
    throw new Error("adapterContractPackageId is required");
  }

  const suiClient = new SuiClientBuilder()
    .withNetworkId(networkId)
    .withRpcUrls(rpcUrls)
    .withQuarantineEnabled()
    .withTelemetry(getRelayerRpcMetricReporter(relayerConfig))
    .build();

  const config = makeSuiConfig({
    packageId: adapterContractPackageId,
    priceAdapterObjectId: adapterContractAddress,
    writePricesTxGasBudget: gasLimit ? BigInt(gasLimit) : undefined,
    gasMultiplier,
    maxTxSendAttempts,
    expectedTxDeliveryTimeInMs: expectedTxDeliveryTimeInMS,
  });

  return new SuiWriteContractAdapter(suiClient, makeSuiKeypair(privateKey), config);
};
