import { Signer } from "@ethersproject/abstract-signer";
import { ContractInterface } from "@ethersproject/contracts";
import { Provider } from "@ethersproject/providers";
import { evmContract, evmWritableContract } from "@redstone-finance/rpc-providers";
import { NetworkId } from "@redstone-finance/utils";
import { abi as redstoneAdapterABI } from "../../../artifacts/contracts/core/RedstoneAdapterBase.sol/RedstoneAdapterBase.json";
import { abi as stylusAdapterABI } from "../../../artifacts/contracts/custom-integrations/stylus/IStylusAdapter.sol/IStylusAdapter.json";
import { abi as priceAdapterWithRoundsABI } from "../../../artifacts/contracts/price-feeds/with-rounds/PriceFeedsAdapterWithRounds.sol/PriceFeedsAdapterWithRounds.json";
import { abi as multifeedAdapterABI } from "../../../artifacts/contracts/price-feeds/without-rounds/MultiFeedAdapterWithoutRounds.sol/MultiFeedAdapterWithoutRounds.json";
import { RedstoneEvmContract } from "./RedstoneEvmContract";

export type EvmAdapterType = "multi-feed" | "price-feeds" | "stylus";

export type EvmContractConfig = {
  networkId?: NetworkId;
  adapterContractAddress: string;
  adapterContractType: EvmAdapterType;
  withRounds?: boolean;
  isV6Contract?: boolean;
};

export function getEvmContract(config: EvmContractConfig, provider: Provider) {
  return buildEvmContract(config, (address, abi, isV6Contract) =>
    evmContract<RedstoneEvmContract>(address, abi, provider, isV6Contract)
  );
}

export function getWritableEvmContract(config: EvmContractConfig, signer: Signer) {
  return buildEvmContract(config, (address, abi, isV6Contract) =>
    evmWritableContract<RedstoneEvmContract>(address, abi, signer, isV6Contract)
  );
}

function buildEvmContract(
  config: EvmContractConfig,
  build: (address: string, abi: ContractInterface, isV6Contract?: boolean) => RedstoneEvmContract
) {
  const { adapterContractAddress, adapterContractType, withRounds, isV6Contract } = config;

  switch (adapterContractType) {
    case "multi-feed":
      return build(adapterContractAddress, multifeedAdapterABI, isV6Contract);
    case "price-feeds":
      return build(
        adapterContractAddress,
        withRounds ? priceAdapterWithRoundsABI : redstoneAdapterABI,
        isV6Contract
      );
    case "stylus":
      return build(adapterContractAddress, stylusAdapterABI, isV6Contract);
  }
}
