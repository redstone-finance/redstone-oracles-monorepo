import { ContractParamsProvider } from "@redstone-finance/sdk";
import { Tx } from "@redstone-finance/utils";

export type EvmTxDeliveryManContext = Tx.TxDeliveryManContext & {
  paramsProvider: ContractParamsProvider;
  canOmitFallbackAfterFailing?: boolean;
};
