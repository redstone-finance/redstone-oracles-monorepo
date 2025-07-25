import axios, { AxiosError } from "axios";
import { LogLevel } from "consola";
import { ethers } from "ethers";
import { getLogLevel, loggerFactory } from "../logger";
import { UnrecoverableError } from "./retry";

export function assert(
  value: unknown,
  errMsg: string,
  unrecoverable: boolean = false
): asserts value {
  if (!value) {
    throw new (unrecoverable ? UnrecoverableError : Error)(
      `Assertion failed: ${errMsg}`
    );
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

let trace: boolean | undefined;

const showStack = (stack: string | undefined): string => {
  if (!stack) {
    return "";
  }
  trace ??= getLogLevel() >= LogLevel.Trace;

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
      const errorMessages: string[] = error.errors.map((e) =>
        stringifyError(e, noStack)
      );
      return `AggregateError: ${error.message ? error.message : "<no message>"}, errors: ${errorMessages.join(
        "; "
      )}`;
    } else if (axios.isAxiosError<unknown>(error)) {
      const urlAsString = `url: ${JSON.stringify(error.config?.url)}`;
      const dataAsString = `data: ${JSON.stringify(error.response?.data)}`;
      const message = `${urlAsString}, ${dataAsString}, ${error.message}`;
      return noStack ? message : `${message}, ${showStack(error.stack)}`;
    } else if (isEthers_5_7_Error(error)) {
      return (
        "[Ethers 5.7 Error]" +
        ethers_5_7_ErrorProps
          .filter((prop) => Object.hasOwn(error, prop))
          .map((prop) => `[${prop}: ${error[prop]}]`)
          .join("") +
        showStack(error.stack)
      );
    } else if (error instanceof Error) {
      const causeString = error.cause
        ? `cause: ${stringifyError(error.cause, noStack)}`
        : "";
      return [error.message, noStack ? "" : showStack(error.stack), causeString]
        .filter((str) => str.length > 0)
        .join(" ");
    } else if (typeof error.toJSON === "function") {
      return JSON.stringify(error.toJSON());
    } else {
      return `Error couldn't be handled by the stringifyError function: ${String(
        e
      )}`;
    }
  } catch (handlingError) {
    return `StringifyError thrown error: ${String(handlingError)} when stringifying error :${String(e)}`;
  }
}

export function simplifyErrorMessage(error: unknown) {
  if (error instanceof AggregateError) {
    const errorMessages: Set<string> = new Set();
    for (const err of error.errors) {
      const errorString = String(err);

      const pattern = "Original error: AggregateError: <no message>, errors:";
      const patternPos = errorString.indexOf(pattern);
      const startIndex = patternPos !== -1 ? patternPos + pattern.length : 0;
      const endPos = errorString.indexOf("\n", startIndex);
      const endIndex = endPos === -1 ? errorString.length : endPos;
      const shortenedError = errorString.substring(startIndex, endIndex).trim();

      errorMessages.add(shortenedError);
    }
    return Array.from(errorMessages).join("\n");
  } else {
    return stringifyError(error);
  }
}
