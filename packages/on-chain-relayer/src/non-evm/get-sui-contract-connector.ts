import {
  makeSuiKeypair,
  SuiClientBuilder,
  SuiPricesContractConnector,
} from "@redstone-finance/sui-connector";
import { RelayerConfig } from "../config/RelayerConfig";

export const getSuiContractConnector = (relayerConfig: RelayerConfig) => {
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
