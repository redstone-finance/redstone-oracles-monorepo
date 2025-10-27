import { LEDGER_TIME_MS, STROOPS_IN_XLM } from "./StellarConstants";

const DEFAULT_GAS_LIMIT_STROOPS = 1 * STROOPS_IN_XLM;
const DEFAULT_MAX_TX_SEND_ATTEMPTS = 5;
const DEFAULT_EXPECTED_TX_DELIVERY_TIME_IN_MS = 11_000;

export const WAIT_BETWEEN_MS = LEDGER_TIME_MS + 1_000;

export interface StellarTxDeliveryManConfig {
  gasLimit: number;
  maxTxSendAttempts: number;
  expectedTxDeliveryTimeInMs: number;
}

export function configFromPartial(config?: Partial<StellarTxDeliveryManConfig>) {
  return {
    gasLimit: config?.gasLimit ?? DEFAULT_GAS_LIMIT_STROOPS,
    maxTxSendAttempts: config?.maxTxSendAttempts ?? DEFAULT_MAX_TX_SEND_ATTEMPTS,
    expectedTxDeliveryTimeInMs:
      config?.expectedTxDeliveryTimeInMs ?? DEFAULT_EXPECTED_TX_DELIVERY_TIME_IN_MS,
  };
}
