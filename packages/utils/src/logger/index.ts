import consola, {
  Consola,
  FancyReporter,
  JSONReporter,
  LogLevel,
} from "consola";
import { z } from "zod";
import { getFromEnv } from "../common/env";
import { isNodeRuntime } from "../common/runtime";

const DEFAULT_ENABLE_JSON_LOGS = true;
const DEFAULT_LOG_LEVEL = LogLevel.Info;

export type RedstoneLogger = Consola | Console;

export const loggerFactory = (moduleName: string): RedstoneLogger => {
  if (isNodeRuntime()) {
    const enableJsonLogs = getFromEnv(
      "REDSTONE_FINANCE_ENABLE_JSON_LOGS",
      z.boolean().default(DEFAULT_ENABLE_JSON_LOGS)
    );
    const mainReporter = enableJsonLogs
      ? new JSONReporter()
      : new FancyReporter();

    const logger = consola
      .create({
        reporters: [mainReporter],
        level: getLogLevel(),
      })
      .withTag(moduleName);

    return createSanitizedLogger(logger);
  } else {
    return console;
  }
};

export const getLogLevel = () => {
  return getFromEnv(
    "REDSTONE_FINANCE_LOG_LEVEL",
    z.nativeEnum(LogLevel).default(DEFAULT_LOG_LEVEL)
  );
};

export function createSanitizedLogger(logger: RedstoneLogger): RedstoneLogger {
  const methods = ["log", "info", "warn", "error", "debug"] as const;
  const sanitizedLogger = { ...logger } as RedstoneLogger;
  methods.forEach((method) => {
    if (typeof logger[method] === "function") {
      const original = logger[method].bind(logger);
      sanitizedLogger[method] = (...args: unknown[]) => {
        const sanitizedArgs = args.map((arg) => sanitizeValue(arg));
        original.apply(logger, sanitizedArgs);
      };
    }
  });
  return sanitizedLogger;
}

export function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizeLogMessage(value);
  } else if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  } else if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = sanitizeValue(val);
    }
    return result;
  }
  return value;
}

export function sanitizeLogMessage(message: string): string {
  // Regex to find HTTP, HTTPS, and WSS URLs in a log message
  const urlRegex = /(https?|wss):\/\/[^\s]+/g;

  return message.replace(urlRegex, (match) => {
    try {
      const parsedUrl = new URL(match);
      const protocol = parsedUrl.protocol;
      const host = parsedUrl.hostname;
      const lastFour = match.slice(-4);
      return `${protocol}//${host}/...${lastFour}`;
    } catch (err) {
      return match;
    }
  });
}
