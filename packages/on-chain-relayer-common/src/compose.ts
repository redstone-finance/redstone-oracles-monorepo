import { z } from "zod";

export const IterationResultSchema = z.discriminatedUnion("result", [
  z.object({ result: z.literal("OK"), didUpdatePrices: z.boolean() }),
  z.object({ result: z.literal("Error"), reason: z.string() }),
]);

export type IterationResult = z.infer<typeof IterationResultSchema>;

export const LOG_RESULT_CODE = "__RESULT__";
const LOG_PREFIX = `REDSTONE`;

export function getMessagePrefix(code: string, prefix = LOG_PREFIX) {
  return `[${prefix}:${code}]`;
}
