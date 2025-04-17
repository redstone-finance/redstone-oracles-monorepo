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
const MAX_DEPTH = 5;

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

    return consola
      .create({
        reporters: [mainReporter],
        level: getLogLevel(),
      })
      .withTag(moduleName);
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

function sanitize(
  val: unknown,
  seen: WeakSet<object>,
  depth: number = 0
): unknown {
  if (depth >= MAX_DEPTH) {
    return "[Max Depth Reached]";
  }
  if (typeof val === "string") {
    return sanitizeLogMessage(val);
  } else if (Array.isArray(val)) {
    if (seen.has(val)) {
      return "[Circular]";
    }
    seen.add(val);
    return val.map((item) => sanitize(item, seen, depth + 1));
  } else if (val !== null && typeof val === "object") {
    if (seen.has(val)) {
      return "[Circular]";
    }
    seen.add(val);
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(val)) {
      result[key] = sanitize(item, seen, depth + 1);
    }
    return result;
  }
  return val;
}

export function sanitizeValue<T>(value: T): T {
  const seen = new WeakSet();
  return sanitize(value, seen) as T;
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
