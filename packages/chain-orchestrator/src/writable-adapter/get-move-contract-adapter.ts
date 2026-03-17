import {
  configFromOptionals,
  makeAptosAccount,
  MoveClientBuilder,
  MovePricesContractConnector,
} from "@redstone-finance/move-connector";

import { ForwardCompatibleWriteContractAdapter } from "@redstone-finance/multichain-kit";
import { PartialRelayerConfig } from "./partial-relayer-config";

export const getMoveContractAdapter = async (
  relayerConfig: PartialRelayerConfig,
  adapterType: "aptos" | "movement"
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

  const aptosClient = MoveClientBuilder.getInstance(adapterType)
    .withNetworkId(networkId)
    .withRpcUrls(rpcUrls)
    .withQuarantineEnabled()
    .build();

  const account = makeAptosAccount(privateKey);

  const connector = new MovePricesContractConnector(
    aptosClient,
    {
      packageObjectAddress: adapterContractPackageId,
      priceAdapterObjectAddress: adapterContractAddress,
    },
    account,
    configFromOptionals(gasLimit, maxTxSendAttempts)
  );

  return await ForwardCompatibleWriteContractAdapter.fromConnector(connector);
};
