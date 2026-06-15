import type { ErrorCode } from "@ethersproject/logger";
import axios, { AxiosError } from "axios";
import { LogLevels } from "consola";
import { ethers } from "ethers";
import { getLogLevel, loggerFactory, sanitizeLogMessage } from "../logger";
import { JSONstringify, stringify } from "./misc";

export class UnrecoverableError extends Error {
  unrecoverable?: boolean = true;
}

export function assert(
  value: unknown,
  errMsg: string,
  unrecoverable: boolean = false
): asserts value {
  if (!value) {
    throw new (unrecoverable ? UnrecoverableError : Error)(`Assertion failed: ${errMsg}`);
  }
}

export function assertThenReturn<T>(value: T | undefined, errMsg: string): T {
  if (!value) {
    throw new Error(`Assertion failed: ${errMsg}`);
  }

  return value;
}

export function assertThenReturnOrFail<T>(
  value: T,
  errors: Error[],
  errMsg: string,
  failOnError: boolean
): T {
  if (errors.length > 0) {
    const error = new AggregateError(errors, errMsg);
    if (failOnError) {
      throw error;
    } else {
      assertWithLog(false, stringifyError(error));
    }
  }

  return value;
}

export const assertWithLog = (condition: boolean, errMsg: string) => {
  const logger = loggerFactory("utils/errors");

  if (!condition) {
    logger.error(`Assertion failed: ${errMsg}`);
  }
};

export const concatMessages = (messages: string[]) => messages.join("\n");

export const throwIfErrorsPresent = (
  errors: UnrecoverableError[],
  context = "",
  thresholdToError = 0
) => {
  assert(
    errors.filter((e) => !!e.message).length <= thresholdToError,
    `${context}\n${concatMessages(errors.map((e) => e.message))}`,
    errors.some((e) => e.unrecoverable)
  );
};

let trace: boolean | undefined;

const showStack = (stack: string | undefined): string => {
  if (!stack) {
    return "";
  }
  trace ??= getLogLevel() >= LogLevels.trace;

  if (trace) {
    return stack + ";";
  }

  return "";
};

const ethers_5_7_errorCodes: string[] = Object.values(ethers.errors);

function isEthers_5_7_Error(error: unknown): error is Ethers_5_7_Error {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    ethers_5_7_errorCodes.includes(error.code)
  );
}

const ethers_5_7_ErrorProps = [
  "code",
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

type Ethers_5_7_Error = {
  [K in (typeof ethers_5_7_ErrorProps)[number]]?: string | number;
} & Error;

export function stringifyError(e: unknown, noStack = false): string {
  try {
    const error = e as
      | AggregateError
      | AxiosError
      | undefined
      | Error
      | { toJSON: () => string }
      | Ethers_5_7_Error;

    if (error === undefined) {
      return "undefined";
    } else if (error instanceof AggregateError) {
      const errorMessages: string[] = error.errors.map((e) => stringifyError(e, noStack));

      return `AggregateError: ${error.message ? error.message : "<no message>"}, errors: ${errorMessages.join(
        "; "
      )}`;
    } else if (axios.isAxiosError<unknown>(error)) {
      const urlAsString = `url: "${sanitizeLogMessage(JSONstringify(error.config?.url))}"`;
      const dataAsString = `data: "${JSONstringify(error.response?.data)}"`;
      const message = `${urlAsString}, ${dataAsString}, ${error.message}`;

      return noStack ? message : `${message}, ${showStack(error.stack)}`;
    } else if (isEthers_5_7_Error(error)) {
      return (
        "[Ethers 5.7 Error]" +
        ethers_5_7_ErrorProps
          .filter((prop) => Object.hasOwn(error, prop))
          .map((prop) =>
            prop === "url"
              ? `[${prop}: "${sanitizeLogMessage(JSONstringify(error[prop]))}"]`
              : `[${prop}: "${error[prop]}"]`
          )
          .join("") +
        showStack(error.stack)
      );
    } else if (error instanceof Error) {
      const causeString = error.cause
        ? typeof error.cause === "object"
          ? `cause: ${stringifyError(error.cause, noStack)}`
          : stringify(error.cause)
        : "";
      const stackString = noStack ? "" : showStack(error.stack);
      // in node Error.stack already contains Error.message
      const messageString = stackString.length > 0 ? "" : error.message;

      return [messageString, stackString, causeString].filter((str) => str.length > 0).join(" ");
    } else if (typeof error.toJSON === "function") {
      return JSONstringify(error.toJSON());
    } else {
      return `Error couldn't be handled by the stringifyError function: ${stringify(e)}`;
    }
  } catch (handlingError) {
    return `StringifyError thrown error: ${stringify(handlingError)} when stringifying error :${stringify(e)}`;
  }
}

export interface EthersError {
  code: ErrorCode;
  message: string;
}

export function isEthersError(e: unknown): e is EthersError {
  const error = e as Partial<EthersError>;

  return !!error.code && !!error.message;
}
