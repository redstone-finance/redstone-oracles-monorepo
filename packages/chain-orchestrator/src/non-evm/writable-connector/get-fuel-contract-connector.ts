import { FuelPricesContractConnector } from "@redstone-finance/fuel-connector";
import {
  ChainTypeEnum,
  deconstructNetworkId,
  RedstoneCommon,
} from "@redstone-finance/utils";
import { Provider, Wallet } from "fuels";
import { PartialRelayerConfig } from "./partial-relayer-config";

export const getFuelContractConnector = async (
  relayerConfig: PartialRelayerConfig
) => {
  const { privateKey, adapterContractAddress, rpcUrls, gasLimit, networkId } =
    relayerConfig;
  const { chainType, chainId } = deconstructNetworkId(networkId);
  if (chainType !== ChainTypeEnum.Enum.fuel) {
    throw new Error(`NetworkId ${networkId} is not a fuel type`);
  }

  if (rpcUrls.length !== 1) {
    throw new Error("Only single rpc url is supported");
  }

  const wallet = Wallet.fromPrivateKey(
    privateKey,
    await Provider.create(rpcUrls[0])
  );

  RedstoneCommon.assert(
    chainId === wallet.provider.getChainId(),
    `The chainId from manifest: ${chainId} is different than fetched from provider: ${wallet.provider.getChainId()}`
  );

  return new FuelPricesContractConnector(
    wallet,
    adapterContractAddress,
    gasLimit
  );
};
