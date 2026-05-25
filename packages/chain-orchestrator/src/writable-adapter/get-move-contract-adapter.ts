import {
  configFromOptionals,
  makeAptosAccount,
  MoveClientBuilder,
  MovePricesContractAdapter,
} from "@redstone-finance/move-connector";
import { PartialRelayerConfig } from "./partial-relayer-config";

export const getMoveContractAdapter = (
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

  const client = MoveClientBuilder.getInstance(adapterType)
    .withNetworkId(networkId)
    .withRpcUrls(rpcUrls)
    .withQuarantineEnabled()
    .build();

  return MovePricesContractAdapter.create(
    client,
    {
      packageObjectAddress: adapterContractPackageId,
      priceAdapterObjectAddress: adapterContractAddress,
    },
    makeAptosAccount(privateKey),
    configFromOptionals(gasLimit, maxTxSendAttempts)
  );
};
