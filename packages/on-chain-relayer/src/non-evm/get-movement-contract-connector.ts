import {
  AptosClientBuilder,
  MovementPricesContractConnector,
  makeAccountFromSecp256k1Key,
} from "@redstone-finance/movement-connector";
import { RelayerConfig } from "../config/RelayerConfig";

export const getMovementContractConnector = (relayerConfig: RelayerConfig) => {
  const {
    privateKey,
    rpcUrls,
    adapterContractAddress,
    chainId,
    adapterContractPackageId,
  } = relayerConfig;
  if (!adapterContractPackageId) {
    throw new Error("adapterContractPackageId is required");
  }

  const aptosClient = new AptosClientBuilder()
    .withChainId(chainId)
    .withRpcUrls(rpcUrls)
    .build();

  const account = makeAccountFromSecp256k1Key(privateKey);

  return new MovementPricesContractConnector(
    aptosClient,
    {
      packageObjectAddress: adapterContractPackageId,
      priceAdapterObjectAddress: adapterContractAddress,
    },
    account
  );
};
