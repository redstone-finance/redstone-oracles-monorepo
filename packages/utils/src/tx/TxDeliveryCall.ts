/**
 * All values have to resolve to hex values
 */
export type TxDeliveryCall = {
  from: string;
  to: string;
  data: string;
  value?: string;
};

export type PopulatedTx = {
  from?: unknown;
  to?: unknown;
  data?: unknown;
};

export const convertToTxDeliveryCall = (transactionRequest: PopulatedTx): TxDeliveryCall => ({
  from: transactionRequest.from as string,
  to: transactionRequest.to as string,
  data: transactionRequest.data as string,
});
