import { RedstoneCommon } from "@redstone-finance/utils";

export const DUMMY_CONTEXT = { slot: 0 };
export const DUMMY_SIGNATURE =
  "4bR5v2jR3iB6veTsiGEhdWmuheiexBqL53ukNyimvm4qE5vZ6JaZtCejuL9kDkTHp928ycp5jTv5YZiC9hEWJBEW";
export const DEFAULT_FEE = { ...DUMMY_CONTEXT, prioritizationFee: 0 };

export type Status = "confirmed" | "finalized" | "error";

export function transactionStatus(status: Status) {
  switch (status) {
    case "confirmed":
    case "finalized":
      return {
        value: {
          ...DUMMY_CONTEXT,
          confirmations: 100,
          confirmationStatus: status,
          err: null,
        },
        context: DUMMY_CONTEXT,
      };
    case "error":
      return {
        value: {
          ...DUMMY_CONTEXT,
          confirmations: 100,
          err: "Error :D",
        },
        context: DUMMY_CONTEXT,
      };
    default:
      return RedstoneCommon.throwUnsupportedParamError(status);
  }
}
