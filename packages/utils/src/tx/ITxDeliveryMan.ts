import { TxDeliveryCall } from "./TxDeliveryCall";

export interface TxDeliveryManContext {
  deferredCallData?: () => Promise<string>;
}

export interface ITxDeliveryMan<Context extends TxDeliveryManContext = TxDeliveryManContext> {
  deliver(txDeliveryCall: TxDeliveryCall, context: Context): Promise<unknown>;
}
