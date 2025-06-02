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

const LogTypeToLevel: { [key: string]: LogLevel } = {
  Fatal: LogLevel.Fatal,
  Error: LogLevel.Error,
  Warn: LogLevel.Warn,
  Log: LogLevel.Log,
  Info: LogLevel.Info,
  Success: LogLevel.Success,
  Debug: LogLevel.Debug,
  Trace: LogLevel.Trace,
  Silent: LogLevel.Silent,
  Verbose: LogLevel.Verbose,
};

let customLogLevels: undefined | null | Record<string, LogLevel> = undefined;

export const loggerFactory = (moduleName: string): RedstoneLogger => {
  if (isNodeRuntime()) {
    if (customLogLevels === undefined) {
      customLogLevels = parseLogLevels();
    }
    const enableJsonLogs = getFromEnv(
      "REDSTONE_FINANCE_ENABLE_JSON_LOGS",
      z.boolean().default(DEFAULT_ENABLE_JSON_LOGS)
    );
    const defaultLogLevel = getLogLevel();
    const logLevel = customLogLevels
      ? getCustomLogLevel(moduleName, customLogLevels, defaultLogLevel)
      : defaultLogLevel;

    const mainReporter = enableJsonLogs
      ? new JSONReporter()
      : new FancyReporter();

    const logger = consola
      .create({
        reporters: [mainReporter],
        level: logLevel,
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

function getCustomLogLevel(
  moduleName: string,
  logLevels: Record<string, LogLevel>,
  defaultLogLevel: LogLevel
): LogLevel {
  if (logLevels[moduleName]) {
    return logLevels[moduleName];
  }
  if (logLevels["*"]) {
    return logLevels["*"];
  }
  return defaultLogLevel;
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

function sanitizePathComponent(value: string) {
  return value.length > 4 ? `...${value.slice(-4)}` : value;
}

export function sanitizeLogMessage(message: string): string {
  // Regex to find HTTP, HTTPS, and WSS URLs in a log message
  const urlRegex = /(https?|wss):\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/g;

  return message.replace(urlRegex, (match) => {
    try {
      const parsedUrl = new URL(match);
      parsedUrl.password = "";
      parsedUrl.username = "";
      parsedUrl.pathname = parsedUrl.search
        ? sanitizePathComponent(parsedUrl.search)
        : sanitizePathComponent(parsedUrl.pathname);
      parsedUrl.search = "";

      return parsedUrl.toString().replace(/\/+$/, "");
    } catch (_err) {
      return match;
    }
  });
}

function parseLogLevels(): Record<string, LogLevel> | null {
  const levels: Record<string, LogLevel> = {};

  const env = getFromEnv("NODE_ENV", z.string().optional());
  if (env !== "test") {
    // custom log levels possible only in a test env
    return null;
  }

  // example format: runner:Error,HealthCheck:Debug,PricesFetcher:Info,*:Silent
  // "*" sets log level for all the other modules.
  // if "*" is not specified - REDSTONE_FINANCE_LOG_LEVEL will be used.
  const customLogLevels = getFromEnv(
    "CUSTOM_LOG_LEVELS",
    z.string().optional()
  );
  if (!customLogLevels) {
    return null;
  }

  customLogLevels.split(",").forEach((item) => {
    const [module, level] = item.split(":");

    if (!Object.hasOwn(LogTypeToLevel, level)) {
      throw new Error(`Unknown log level ${level} for ${module}`);
    }

    levels[module] = LogTypeToLevel[level];
  });

  return levels;
}
