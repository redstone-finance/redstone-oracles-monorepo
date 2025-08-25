const STROOPS_IN_XLM = 10_000_000;
const LEDGER_TIME_MS = 5_000;

const DEFAULT_GAS_LIMIT_STROOPS = 1 * STROOPS_IN_XLM;
const DEFAULT_GAS_MULTIPLIER = 1.4;
const DEFAULT_MAX_TX_SEND_ATTEMPTS = 5;

export const WAIT_BETWEEN_MS = LEDGER_TIME_MS + 1_000;

export interface StellarTxDeliveryManConfig {
  gasLimit: number;
  gasMultiplier: number;
  maxTxSendAttempts: number;
  expectedTxDeliveryTimeInMS?: number;
}

export function configFromPartial(
  config?: Partial<StellarTxDeliveryManConfig>
) {
  return {
    gasLimit: config?.gasLimit ?? DEFAULT_GAS_LIMIT_STROOPS,
    gasMultiplier: config?.gasMultiplier ?? DEFAULT_GAS_MULTIPLIER,
    maxTxSendAttempts:
      config?.maxTxSendAttempts ?? DEFAULT_MAX_TX_SEND_ATTEMPTS,
    expectedTxDeliveryTimeInMS: config?.expectedTxDeliveryTimeInMS,
  };
}
