import { TransactionConfig } from "./types";

export const TRANSACTION_DEFAULT_CONFIG: TransactionConfig = {
  writePriceOctasTxGasBudget: 100_000_000,
  maxTxSendAttempts: 5,
};

export function configFromOptionals(
  writePriceOctasTxGasBudgetOptional?: number,
  maxTxSendAttemptsOptional?: number
) {
  const writePriceOctasTxGasBudget =
    writePriceOctasTxGasBudgetOptional ?? TRANSACTION_DEFAULT_CONFIG.writePriceOctasTxGasBudget;
  const maxTxSendAttempts =
    maxTxSendAttemptsOptional ?? TRANSACTION_DEFAULT_CONFIG.maxTxSendAttempts;

  return {
    writePriceOctasTxGasBudget,
    maxTxSendAttempts,
  };
}
