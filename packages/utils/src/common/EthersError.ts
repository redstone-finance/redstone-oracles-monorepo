import { ErrorCode } from "@ethersproject/logger";

export interface EthersError {
  code: ErrorCode;
  message: string;
}

export type Ethers_5_7_Error = {
  [K in (typeof ETHERS_ERROR_PROPS)[number]]?: unknown;
} & Error;

export const ETHERS_5_7_ERROR_PROPS = [
  "code",
  "error",
  "reason",
  "url",
  "requestBody",
  "timeout",
  "method",
  "address",
  "args",
  "errorSignature",
  "body",
] as const;
export const ETHERS_6_ERROR_PROPS = ["shortMessage", "info"] as const;
export const ETHERS_ERROR_PROPS = [...ETHERS_5_7_ERROR_PROPS, ...ETHERS_6_ERROR_PROPS] as const;
const ethers_5_7_errorCodes: string[] = Object.values(ErrorCode);

export function isEthersError(e: unknown): e is EthersError {
  const error = e as Partial<EthersError>;

  return !!error.code && !!error.message;
}

export function isEthers_5_7_Error(error: unknown): error is Ethers_5_7_Error {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    ethers_5_7_errorCodes.includes(error.code)
  );
}
