import { BackwardCompatibleConnector } from "@redstone-finance/multichain-kit";
import {
  makeSuiConfig,
  makeSuiKeypair,
  SuiClientBuilders,
  SuiContractConnector,
} from "@redstone-finance/sui-connector";
import { PartialRelayerConfig } from "./partial-relayer-config";

export const getSuiContractConnector = (relayerConfig: PartialRelayerConfig) => {
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
    graphQLUrls,
  } = relayerConfig;
  if (!adapterContractPackageId) {
    throw new Error("adapterContractPackageId is required");
  }

  const suiClient = (
    graphQLUrls !== undefined
      ? SuiClientBuilders.clientBuilder().withGraphqlUrls(graphQLUrls)
      : SuiClientBuilders.legacyClientBuilder()
  )
    .withNetworkId(networkId)
    .withRpcUrls(rpcUrls)
    .withQuarantineEnabled()
    .build();

  const config = makeSuiConfig({
    packageId: adapterContractPackageId,
    priceAdapterObjectId: adapterContractAddress,
    writePricesTxGasBudget: gasLimit ? BigInt(gasLimit) : undefined,
    gasMultiplier,
    maxTxSendAttempts,
    expectedTxDeliveryTimeInMs: expectedTxDeliveryTimeInMS,
  });

  const fullConnector = new SuiContractConnector(suiClient, config, makeSuiKeypair(privateKey));

  return new BackwardCompatibleConnector(fullConnector);
};
