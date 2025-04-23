import { loggerFactory } from "@redstone-finance/utils";
import { z } from "zod";

const ConfirmationErrorScheme = z.object({
  InstructionError: z.tuple([
    z.number(),
    z.object({
      Custom: z.number(),
    }),
  ]),
});

export enum SkippableRustSdkError {
  TimestampTooOld = 1000,
  TimestampTooFuture = 1050,
  DataTimestampMustBeGreaterThanBefore = 1101,
  CurrentTimestampMustBeGreaterThanLatestUpdateTimestamp = 1102,
}

export class SolanaRustSdkErrroHandler {
  private static logger = loggerFactory("solana-rust-sdk-error-handler");

  static canSkipError(error: unknown) {
    const parseResult = ConfirmationErrorScheme.safeParse(error);

    if (!parseResult.success) {
      return false;
    }

    const errorCode = parseResult.data.InstructionError[1].Custom;
    const sdkError = SkippableRustSdkError[errorCode];

    if (sdkError) {
      SolanaRustSdkErrroHandler.logger.info(
        `Transaction error should be skipped: ${sdkError}`
      );
      return true;
    }

    return false;
  }
}
