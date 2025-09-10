import { InvokeCommand } from "@aws-sdk/client-lambda";
import { RedstoneCommon } from "@redstone-finance/utils";
import z from "zod";
import { getLambdaClient } from "./aws-clients";

const errorSeverities = ["critical", "error", "warning", "info"] as const;

export const ErrorSeveritiesEnum = z.enum(errorSeverities);
export type ErrorSeverity = z.infer<typeof ErrorSeveritiesEnum>;

export function invokeLambda(functionName: string, payload: unknown, region?: string) {
  const command = new InvokeCommand({
    FunctionName: functionName,
    Payload: JSON.stringify(payload),
    LogType: "None",
  });

  return getLambdaClient(region).send(command);
}

export async function sendErrorLog(
  functionName: string,
  errorLog: string,
  severity?: ErrorSeverity,
  region?: string
) {
  try {
    await invokeLambda(functionName, { message: errorLog, severity }, region);
  } catch (e) {
    throw new Error(`Error sending error log: ${RedstoneCommon.stringifyError(e)}`);
  }
}
