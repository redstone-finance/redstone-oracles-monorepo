import {
  makeSuiConfig,
  makeSuiKeypair,
  SuiClientBuilder,
  SuiPricesContractConnector,
} from "@redstone-finance/sui-connector";
import { PartialRelayerConfig } from "./partial-relayer-config";

export const getSuiContractConnector = (
  relayerConfig: PartialRelayerConfig
) => {
  const {
    privateKey,
    rpcUrls,
    adapterContractAddress,
    chainId,
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
    .withChainId(chainId)
    .withRpcUrls(rpcUrls)
    .build();

  const config = makeSuiConfig({
    packageId: adapterContractPackageId,
    priceAdapterObjectId: adapterContractAddress,
    writePricesTxGasBudget: gasLimit ? BigInt(gasLimit) : undefined,
    gasMultiplier,
    maxTxSendAttempts,
    expectedTxDeliveryTimeInMs: expectedTxDeliveryTimeInMS,
  });

  return new SuiPricesContractConnector(
    suiClient,
    config,
    makeSuiKeypair(privateKey)
  );
};
