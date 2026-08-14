import axios, { AxiosError } from "axios";
import { LogLevels } from "consola";
import { getLogLevel, loggerFactory } from "../logger";
import { sanitizeLogMessage } from "../logger/sanitize-token";
import { ETHERS_5_7_ERROR_PROPS, isEthers_5_7_Error, type Ethers_5_7_Error } from "./EthersError";
import { JSONstringify, stringify } from "./misc";

export class UnrecoverableError extends Error {
  unrecoverable? = true;
}

export function assert(value: unknown, errMsg: string, unrecoverable = false): asserts value {
  if (!value) {
    throw new (unrecoverable ? UnrecoverableError : Error)(`Assertion failed: ${errMsg}`);
  }
}

export function assertThenReturn<T>(value: T | undefined, errMsg: string) {
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

const showStack = (stack?: string) => {
  if (!stack) {
    return "";
  }
  trace ??= getLogLevel() >= LogLevels.trace;

  if (trace) {
    return stack + ";";
  }

  return "";
};

export function stringifyError(e: unknown, noStack = false) {
  return sanitizeLogMessage(stringifyErrorUnsanitized(e, noStack));
}

function stringifyErrorUnsanitized(e: unknown, noStack = false): string {
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
    } else if (typeof e === "string") {
      return e;
    } else if (error instanceof AggregateError) {
      const errorMessages: string[] = error.errors.map((e) =>
        stringifyErrorUnsanitized(e, noStack)
      );

      return `AggregateError: ${error.message ? error.message : "<no message>"}, errors: ${errorMessages.join(
        "; "
      )}`;
    } else if (axios.isAxiosError<unknown>(error)) {
      const urlAsString = `url: "${JSONstringify(error.config?.url)}"`;
      const dataAsString = `data: "${JSONstringify(error.response?.data)}"`;
      const message = `${urlAsString}, ${dataAsString}, ${error.message}`;

      return noStack ? message : `${message}, ${showStack(error.stack)}`;
    } else if (isEthers_5_7_Error(error)) {
      return (
        "[Ethers 5.7 Error]" +
        ETHERS_5_7_ERROR_PROPS.filter((prop) => Object.hasOwn(error, prop))
          .map((prop) => `[${prop}: "${error[prop]}"]`)
          .join("") +
        showStack(error.stack)
      );
    } else if (error instanceof Error) {
      const causeString = error.cause
        ? typeof error.cause === "object"
          ? `cause: ${stringifyErrorUnsanitized(error.cause, noStack)}`
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
