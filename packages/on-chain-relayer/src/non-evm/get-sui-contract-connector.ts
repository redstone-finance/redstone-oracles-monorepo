import {
  makeSuiKeypair,
  SuiClientBuilder,
  SuiPricesContractConnector,
} from "@redstone-finance/sui-connector";
import { RelayerConfig } from "../config/RelayerConfig";

export const getSuiContractConnector = async (relayerConfig: RelayerConfig) => {
  const {
    privateKey,
    rpcUrls,
    adapterContractAddress,
    chainId,
    gasLimit,
    adapterContractPackageId,
  } = relayerConfig;
  if (!adapterContractPackageId) {
    throw new Error("adapterContractPackageId is required");
  }

  const suiClient = await new SuiClientBuilder()
    .withChainId(chainId)
    .withRpcUrls(rpcUrls)
    .buildAndVerify();

  return new SuiPricesContractConnector(
    suiClient,
    {
      packageId: adapterContractPackageId,
      priceAdapterObjectId: adapterContractAddress,
      writePricesTxGasBudget: gasLimit ? BigInt(gasLimit) : undefined,
    },
    makeSuiKeypair(privateKey)
  );
};
