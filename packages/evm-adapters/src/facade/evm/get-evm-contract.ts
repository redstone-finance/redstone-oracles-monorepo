import { Provider } from "@ethersproject/providers";
import { evmWritableContract } from "@redstone-finance/rpc-providers";
import { NetworkId } from "@redstone-finance/utils";
import { abi as redstoneAdapterABI } from "../../../artifacts/contracts/core/RedstoneAdapterBase.sol/RedstoneAdapterBase.json";
import { abi as stylusAdapterABI } from "../../../artifacts/contracts/custom-integrations/stylus/IStylusAdapter.sol/IStylusAdapter.json";
import { abi as priceAdapterWithRoundsABI } from "../../../artifacts/contracts/price-feeds/with-rounds/PriceFeedsAdapterWithRounds.sol/PriceFeedsAdapterWithRounds.json";
import { abi as multifeedAdapterABI } from "../../../artifacts/contracts/price-feeds/without-rounds/MultiFeedAdapterWithoutRounds.sol/MultiFeedAdapterWithoutRounds.json";
import {
  IStylusAdapter,
  MultiFeedAdapterWithoutRounds,
  PriceFeedsAdapterWithRounds,
  RedstoneAdapterBase,
} from "../../../typechain-types";
import { RedstoneEvmContract } from "./RedstoneEvmContract";

export type EvmAdapterType = "multi-feed" | "price-feeds" | "stylus";

export function getEvmContract(
  config: {
    networkId?: NetworkId;
    adapterContractAddress: string;
    adapterContractType: EvmAdapterType;
    withRounds?: boolean;
    isV6Contract?: boolean;
  },
  provider: Provider
): RedstoneEvmContract {
  const { adapterContractAddress, adapterContractType, withRounds, isV6Contract } = config;

  switch (adapterContractType) {
    case "multi-feed":
      return evmWritableContract<MultiFeedAdapterWithoutRounds>(
        adapterContractAddress,
        multifeedAdapterABI,
        provider,
        isV6Contract
      );

    case "price-feeds": {
      if (withRounds) {
        return evmWritableContract<PriceFeedsAdapterWithRounds>(
          adapterContractAddress,
          priceAdapterWithRoundsABI,
          provider,
          isV6Contract
        );
      }

      return evmWritableContract<RedstoneAdapterBase>(
        adapterContractAddress,
        redstoneAdapterABI,
        provider,
        isV6Contract
      );
    }

    case "stylus":
      return evmWritableContract<IStylusAdapter & RedstoneAdapterBase>(
        adapterContractAddress,
        stylusAdapterABI,
        provider,
        isV6Contract
      );
  }
}
