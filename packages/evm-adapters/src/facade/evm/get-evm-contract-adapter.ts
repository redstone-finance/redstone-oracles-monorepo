import { NetworkId, RedstoneCommon, Tx } from "@redstone-finance/utils";
import {
  IStylusAdapter,
  MentoAdapterBase,
  MultiFeedAdapterWithoutRounds,
  RedstoneAdapterBase,
} from "../../../typechain-types";
import { isArbitrumStylusNetworkId } from "../../config/config-checks";
import { EvmContractAdapter } from "../../core/contract-interactions/EvmContractAdapter";
import { MentoEvmContractAdapter } from "../../core/contract-interactions/MentoEvmContractAdapter";
import { MultiFeedEvmContractAdapter } from "../../core/contract-interactions/MultiFeedEvmContractAdapter";
import { PriceFeedsEvmContractAdapter } from "../../core/contract-interactions/PriceFeedsEvmContractAdapter";
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
  },
  adapterContract: RedstoneEvmContract,
  txDeliveryMan = emptyTxDeliveryMan
): EvmContractAdapter<RedstoneEvmContract> {
  switch (config.adapterContractType) {
    case "multi-feed": {
      if (isArbitrumStylusNetworkId(config.networkId)) {
        return new StylusContractAdapter(
          adapterContract as IStylusAdapter & MultiFeedAdapterWithoutRounds,
          txDeliveryMan
        );
      }

      return new MultiFeedEvmContractAdapter(
        adapterContract as MultiFeedAdapterWithoutRounds,
        txDeliveryMan,
        RedstoneCommon.isTruthy(config.oevAuctionUrl?.length)
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
        config.mentoMaxDeviationAllowed
      );
    }
  }
}
