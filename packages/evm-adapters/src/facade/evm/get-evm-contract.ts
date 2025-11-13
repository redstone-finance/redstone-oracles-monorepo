import { Provider } from "@ethersproject/providers";
import { NetworkId } from "@redstone-finance/utils";
import { Contract, Signer } from "ethers";
import { abi as redstoneAdapterABI } from "../../../artifacts/contracts/core/RedstoneAdapterBase.sol/RedstoneAdapterBase.json";
import { abi as mentoAdapterABI } from "../../../artifacts/contracts/custom-integrations/mento/MentoAdapterBase.sol/MentoAdapterBase.json";
import { abi as stylusAdapterABI } from "../../../artifacts/contracts/custom-integrations/stylus/IStylusAdapter.sol/IStylusAdapter.json";
import { abi as multifeedAdapterABI } from "../../../artifacts/contracts/price-feeds/without-rounds/MultiFeedAdapterWithoutRounds.sol/MultiFeedAdapterWithoutRounds.json";
import {
  IStylusAdapter,
  MentoAdapterBase,
  MultiFeedAdapterWithoutRounds,
  RedstoneAdapterBase,
} from "../../../typechain-types";
import { isArbitrumStylusNetworkId } from "../../config/config-checks";
import { RedstoneEvmContract } from "./RedstoneEvmContract";

export type EvmAdapterType = "multi-feed" | "price-feeds" | "mento";

export function getEvmContract(
  config: {
    networkId?: NetworkId;
    adapterContractAddress: string;
    adapterContractType: EvmAdapterType;
  },
  signerOrProvider?: Signer | Provider
): RedstoneEvmContract {
  const { adapterContractAddress, adapterContractType } = config;

  switch (adapterContractType) {
    case "multi-feed": {
      if (isArbitrumStylusNetworkId(config.networkId)) {
        return new Contract(
          adapterContractAddress,
          stylusAdapterABI,
          signerOrProvider
        ) as IStylusAdapter & RedstoneAdapterBase;
      }

      return new Contract(
        adapterContractAddress,
        multifeedAdapterABI,
        signerOrProvider
      ) as MultiFeedAdapterWithoutRounds;
    }

    case "price-feeds": {
      return new Contract(
        adapterContractAddress,
        redstoneAdapterABI,
        signerOrProvider
      ) as RedstoneAdapterBase;
    }

    case "mento": {
      return new Contract(
        adapterContractAddress,
        mentoAdapterABI,
        signerOrProvider
      ) as MentoAdapterBase;
    }
  }
}
