import {
  AptosClientBuilder,
  MovementPricesContractConnector,
  configFromOptionals,
  makeAptosAccount,
} from "@redstone-finance/movement-connector";
import { RelayerConfig } from "../config/RelayerConfig";

export const getMovementContractConnector = (relayerConfig: RelayerConfig) => {
  const {
    privateKey,
    rpcUrls,
    adapterContractAddress,
    chainId,
    adapterContractPackageId,
    gasLimit,
    maxTxSendAttempts,
  } = relayerConfig;
  if (!adapterContractPackageId) {
    throw new Error("adapterContractPackageId is required");
  }

  const aptosClient = new AptosClientBuilder()
    .withChainId(chainId)
    .withRpcUrls(rpcUrls)
    .build();

  const account = makeAptosAccount(privateKey);

  return new MovementPricesContractConnector(
    aptosClient,
    {
      packageObjectAddress: adapterContractPackageId,
      priceAdapterObjectAddress: adapterContractAddress,
    },
    account,
    configFromOptionals(gasLimit, maxTxSendAttempts)
  );
};
