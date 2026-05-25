import { NetworkId, RedstoneCommon, Tx } from "@redstone-finance/utils";
import {
  IStylusAdapter,
  MentoAdapterBase,
  MultiFeedAdapterWithoutRounds,
  PriceFeedsAdapterWithRounds,
  RedstoneAdapterBase,
} from "../../../typechain-types";
import { EvmContractAdapter } from "../../core/contract-interactions/EvmContractAdapter";
import { MentoEvmContractAdapter } from "../../core/contract-interactions/MentoEvmContractAdapter";
import { MultiFeedEvmContractAdapter } from "../../core/contract-interactions/MultiFeedEvmContractAdapter";
import { PriceFeedsEvmContractAdapter } from "../../core/contract-interactions/PriceFeedsEvmContractAdapter";
import { PriceFeedsEvmContractAdapterWithRounds } from "../../core/contract-interactions/PriceFeedsEvmContractAdapterWithRounds";
import { StylusContractAdapter } from "../../core/contract-interactions/StylusContractAdapter";
import { RedstoneEvmContract } from "./RedstoneEvmContract";
import { EvmAdapterType } from "./get-evm-contract";

const emptyTxDeliveryMan: Tx.ITxDeliveryMan = {
  deliver: (_txDeliveryCall: Tx.TxDeliveryCall, _context: Tx.TxDeliveryManContext) =>
    Promise.resolve(),
};

export function getEvmContractAdapter(
  config: {
    networkId?: NetworkId;
    adapterContractType: EvmAdapterType;
    mentoMaxDeviationAllowed?: number;
    oevAuctionUrl?: string;
    withRounds?: boolean;
  },
  adapterContract: RedstoneEvmContract,
  txDeliveryMan = emptyTxDeliveryMan
): EvmContractAdapter<RedstoneEvmContract> {
  switch (config.adapterContractType) {
    case "multi-feed":
      return new MultiFeedEvmContractAdapter(
        adapterContract as MultiFeedAdapterWithoutRounds,
        txDeliveryMan,
        RedstoneCommon.isTruthy(config.oevAuctionUrl?.length)
      );

    case "price-feeds": {
      if (config.withRounds) {
        return new PriceFeedsEvmContractAdapterWithRounds(
          adapterContract as PriceFeedsAdapterWithRounds,
          txDeliveryMan
        );
      }

      return new PriceFeedsEvmContractAdapter(
        adapterContract as RedstoneAdapterBase,
        txDeliveryMan
      );
    }

    case "mento":
      return new MentoEvmContractAdapter(
        adapterContract as MentoAdapterBase,
        txDeliveryMan,
        config.mentoMaxDeviationAllowed
      );

    case "stylus":
      return new StylusContractAdapter(
        adapterContract as IStylusAdapter & MultiFeedAdapterWithoutRounds,
        txDeliveryMan
      );
  }
}
