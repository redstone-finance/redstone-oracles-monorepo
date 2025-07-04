import { AdapterType } from "@redstone-finance/on-chain-relayer-common";
import { TxDeliveryCall } from "@redstone-finance/rpc-providers";
import { RedstoneCommon, Tx } from "@redstone-finance/utils";
import {
  MentoAdapterBase,
  MultiFeedAdapterWithoutRounds,
  RedstoneAdapterBase,
} from "../../../typechain-types";
import { isOevRelayerConfig } from "../../config/is-oev-relayer-config";
import { EvmContractAdapter } from "../../core/contract-interactions/EvmContractAdapter";
import { MentoEvmContractAdapter } from "../../core/contract-interactions/MentoEvmContractAdapter";
import { MultiFeedEvmContractAdapter } from "../../core/contract-interactions/MultiFeedEvmContractAdapter";
import { PriceFeedsEvmContractAdapter } from "../../core/contract-interactions/PriceFeedsEvmContractAdapter";
import { RedstoneEvmContract } from "./EvmContractFacade";

const emptyTxDeliveryMan: Tx.ITxDeliveryMan = {
  deliver: (
    _txDeliveryCall: TxDeliveryCall,
    _context: Tx.TxDeliveryManContext
  ) => Promise.resolve(),
};

export function getEvmContractAdapter(
  relayerConfig: {
    adapterContractType: AdapterType;
    mentoMaxDeviationAllowed?: number;
    oevAuctionUrl?: string;
  },
  adapterContract: RedstoneEvmContract,
  txDeliveryMan = emptyTxDeliveryMan
): EvmContractAdapter<RedstoneEvmContract> {
  switch (relayerConfig.adapterContractType) {
    case "multi-feed": {
      return new MultiFeedEvmContractAdapter(
        adapterContract as MultiFeedAdapterWithoutRounds,
        txDeliveryMan,
        isOevRelayerConfig(relayerConfig)
      );
    }

    case "price-feeds": {
      return new PriceFeedsEvmContractAdapter(
        adapterContract as RedstoneAdapterBase,
        txDeliveryMan
      );
    }

    case "mento": {
      return new MentoEvmContractAdapter(
        adapterContract as MentoAdapterBase,
        txDeliveryMan,
        relayerConfig.mentoMaxDeviationAllowed
      );
    }

    default:
      return RedstoneCommon.throwUnsupportedParamError(
        relayerConfig.adapterContractType
      );
  }
}
