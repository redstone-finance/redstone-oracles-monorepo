import { Provider } from "@ethersproject/providers";
import { AdapterType } from "@redstone-finance/on-chain-relayer-common";
import { Contract, Signer } from "ethers";
import { abi as redstoneAdapterABI } from "../../artifacts/contracts/core/RedstoneAdapterBase.sol/RedstoneAdapterBase.json";
import { abi as mentoAdapterABI } from "../../artifacts/contracts/custom-integrations/mento/MentoAdapterBase.sol/MentoAdapterBase.json";
import { abi as multifeedAdapterABI } from "../../artifacts/contracts/price-feeds/without-rounds/MultiFeedAdapterWithoutRounds.sol/MultiFeedAdapterWithoutRounds.json";
import {
  MentoAdapterBase,
  MultiFeedAdapterWithoutRounds,
  RedstoneAdapterBase,
} from "../../typechain-types";
import { RedstoneEvmContract } from "./EvmContractFacade";

export function getEvmContract(
  relayerConfig: {
    adapterContractAddress: string;
    adapterContractType: AdapterType;
  },
  signerOrProvider?: Signer | Provider
): RedstoneEvmContract {
  const { adapterContractAddress, adapterContractType } = relayerConfig;

  switch (adapterContractType) {
    case "multi-feed": {
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

    default:
      throw new Error(
        `adapterContractType ${adapterContractType} is not supported`
      );
  }
}
