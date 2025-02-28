import {
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
  } = relayerConfig;
  if (!adapterContractPackageId) {
    throw new Error("adapterContractPackageId is required");
  }

  const suiClient = new SuiClientBuilder()
    .withChainId(chainId)
    .withRpcUrls(rpcUrls)
    .build();

  return new SuiPricesContractConnector(
    suiClient,
    {
      packageId: adapterContractPackageId,
      priceAdapterObjectId: adapterContractAddress,
      writePricesTxGasBudget: gasLimit ? BigInt(gasLimit) : undefined,
      gasMultiplier,
      maxTxSendAttempts,
    },
    makeSuiKeypair(privateKey)
  );
};
