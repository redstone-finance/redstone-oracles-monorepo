import {
  AptosClientBuilder,
  MovementPricesContractConnector,
  configFromOptionals,
  makeAptosAccount,
} from "@redstone-finance/movement-connector";

import { PartialRelayerConfig } from "./partial-relayer-config";

export const getMovementContractConnector = (
  relayerConfig: PartialRelayerConfig
) => {
  const {
    privateKey,
    rpcUrls,
    adapterContractAddress,
    networkId,
    adapterContractPackageId,
    gasLimit,
    maxTxSendAttempts,
  } = relayerConfig;
  if (!adapterContractPackageId) {
    throw new Error("adapterContractPackageId is required");
  }

  const aptosClient = new AptosClientBuilder()
    .withNetworkId(networkId)
    .withRpcUrls(rpcUrls)
    .withQuarantineEnabled()
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
