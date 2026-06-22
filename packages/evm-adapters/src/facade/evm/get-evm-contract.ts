import { Provider } from "@ethersproject/providers";
import { NetworkId } from "@redstone-finance/utils";
import { Contract, Signer } from "ethers";
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
  },
  signerOrProvider?: Signer | Provider
): RedstoneEvmContract {
  const { adapterContractAddress, adapterContractType, withRounds } = config;

  switch (adapterContractType) {
    case "multi-feed":
      return new Contract(
        adapterContractAddress,
        multifeedAdapterABI,
        signerOrProvider
      ) as MultiFeedAdapterWithoutRounds;

    case "price-feeds": {
      if (withRounds) {
        return new Contract(
          adapterContractAddress,
          priceAdapterWithRoundsABI,
          signerOrProvider
        ) as PriceFeedsAdapterWithRounds;
      }

      return new Contract(
        adapterContractAddress,
        redstoneAdapterABI,
        signerOrProvider
      ) as RedstoneAdapterBase;
    }

    case "stylus":
      return new Contract(
        adapterContractAddress,
        stylusAdapterABI,
        signerOrProvider
      ) as IStylusAdapter & RedstoneAdapterBase;
  }
}
