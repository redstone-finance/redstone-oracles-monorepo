import {
  createConsola,
  LogLevels,
  type ConsolaInstance,
  type LogLevel,
  type LogObject,
} from "consola/basic";
import { z } from "zod";
import { getFromEnv } from "../common/env";
import { JSONstringify, unescapeString } from "../common/misc";
import { isNodeRuntime } from "../common/runtime";
import { keepLastCharacters, sanitizeLogMessage } from "./sanitize-token";

const DEFAULT_ENABLE_JSON_LOGS = true;
const DEFAULT_LOG_LEVEL = LogLevels.info;
export const MAX_DEPTH = 5;

const NUMERIC_LABEL = /^\d+$/;

export const SENSITIVE_KEYS = new Set([
  "apiKey",
  "x-api-key",
  "privateKey",
  "telemetryUrl",
  "telemetryAuthorizationToken",
  "authorization",
  "Authorization",
  "token",
  "secret",
  "password",
]);

export type RedstoneLogger = ConsolaInstance | Console;

const LogTypeToLevel: { [key: string]: LogLevel } = {
  Fatal: LogLevels.fatal,
  Error: LogLevels.error,
  Warn: LogLevels.warn,
  Log: LogLevels.log,
  Info: LogLevels.info,
  Success: LogLevels.success,
  Debug: LogLevels.debug,
  Trace: LogLevels.trace,
  Silent: LogLevels.silent,
  Verbose: LogLevels.verbose,
};

const MethodToLogLevel: Record<string, LogLevel> = {
  log: LogLevels.log,
  info: LogLevels.info,
  warn: LogLevels.warn,
  error: LogLevels.error,
  debug: LogLevels.debug,
  trace: LogLevels.trace,
};

let customLogLevels: undefined | null | Record<string, LogLevel> = undefined;

export function isInfoEnabled(): boolean {
  return getLogLevel() >= LogLevels.info;
}

export function isDebugEnabled(): boolean {
  return getLogLevel() >= LogLevels.debug;
}

export function isTraceEnabled(): boolean {
  return getLogLevel() >= LogLevels.trace;
}

export const loggerFactory = (
  moduleName: string,
  defaultEnableJsonLogs = DEFAULT_ENABLE_JSON_LOGS
): RedstoneLogger => {
  if (isNodeRuntime()) {
    if (customLogLevels === undefined) {
      customLogLevels = parseLogLevels();
    }
    const enableJsonLogs = getFromEnv(
      "REDSTONE_FINANCE_ENABLE_JSON_LOGS",
      z.boolean().default(defaultEnableJsonLogs)
    );
    // Off: quotes are left unescaped so it preserves good readability in CloudWatch
    // On: every line is valid JSON, for log routing that has to parse it and correctly forward to destination (CW or S3)
    const strictJsonLogs = getFromEnv(
      "REDSTONE_FINANCE_STRICT_JSON_LOGS",
      z.boolean().default(false)
    );
    const defaultLogLevel = getLogLevel();
    const logLevel = customLogLevels
      ? getCustomLogLevel(moduleName, customLogLevels, defaultLogLevel)
      : defaultLogLevel;

    const reporters = enableJsonLogs ? [new JSONReporter(strictJsonLogs)] : undefined;

    const logger = createConsola({
      ...(reporters ? { reporters } : []),
      fancy: !reporters,
      level: logLevel,
    }).withTag(moduleName);

    return createSanitizedLogger(logger, strictJsonLogs);
  } else {
    return console;
  }
};

export const getLogLevel = () => {
  return getFromEnv("REDSTONE_FINANCE_LOG_LEVEL", z.number().default(DEFAULT_LOG_LEVEL));
};

export function createSanitizedLogger(
  logger: RedstoneLogger,
  parseSerializedJsonArgs = false
): RedstoneLogger {
  const methods = ["log", "info", "warn", "error", "debug", "trace"] as const;
  const sanitizedLogger = { ...logger } as RedstoneLogger;

  methods.forEach((method) => {
    if (typeof logger[method] === "function") {
      const original = logger[method].bind(logger);

      // Determine the required level for this specific method (e.g., debug = 4)
      const methodLevel = MethodToLogLevel[method] ?? LogLevels.info;

      sanitizedLogger[method] = (...args: unknown[]) => {
        // If we are in Node (Consola), we can check the current instance .level property.
        // If the current configured level is lower than the method's level,
        // we skip execution entirely
        const currentLevel = (logger as ConsolaInstance).level;

        if (currentLevel < methodLevel) {
          return;
        }

        const sanitizedArgs = args.map((arg, index) => {
          // 2. Lazy Evaluation:
          // Because we successfully passed the level check above, we now
          // execute the function (if it is one) to retrieve the log message/object.
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- add reason here, please
          const val =
            typeof arg === "function"
              ? // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- add reason here, please
                arg()
              : arg;

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- add reason here, please
          return sanitizeValue(
            parseSerializedJsonArgs && index > 0 ? parseSerializedJson(val) : val
          );
        });

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

function objectDepth(val: unknown): number {
  if (isPrimitive(val)) {
    return 0;
  }

  return 1 + Math.max(0, ...Object.values(val as object).map(objectDepth));
}

function parseSerializedJson(val: unknown): unknown {
  if (typeof val !== "string" || !(val.startsWith("{") || val.startsWith("["))) {
    return val;
  }
  try {
    const parsed: unknown = JSON.parse(val);

    return JSON.stringify(parsed) === val && objectDepth(parsed) <= MAX_DEPTH ? parsed : val;
  } catch {
    return val;
  }
}

const isPrimitive = (val: unknown) => {
  return val === null || (typeof val !== "object" && typeof val !== "function");
};

function sanitize(val: unknown, seen: WeakSet<object>, depth: number = 0): unknown {
  if (isPrimitive(val)) {
    return typeof val === "string" ? sanitizeLogMessage(val) : val;
  } else if (depth >= MAX_DEPTH) {
    return "[Max Depth Reached]";
  } else if (Array.isArray(val)) {
    if (seen.has(val)) {
      return "[Circular]";
    }
    seen.add(val);
    const result = val.map((item) => sanitize(item, seen, depth + 1));
    seen.delete(val);

    return result;
  } else if (val !== null && typeof val === "object") {
    if (seen.has(val)) {
      return "[Circular]";
    }

    const maybeToJson = (val as { toJSON?: () => unknown }).toJSON;
    if (typeof maybeToJson === "function") {
      seen.add(val);
      const json = sanitize(maybeToJson.call(val), seen, depth + 1);
      seen.delete(val);

      return json;
    }

    seen.add(val);
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(val)) {
      result[key] = SENSITIVE_KEYS.has(key)
        ? maskSensitiveValue(item)
        : sanitize(item, seen, depth + 1);
    }
    seen.delete(val);

    return result;
  }

  return val;
}

export function sanitizeValue<T>(value: T): T {
  const seen = new WeakSet();

  return sanitize(value, seen) as T;
}

export function maskSensitiveValue(value: unknown): string {
  return typeof value === "string" && value.length > 16 ? `${value.slice(0, 4)}...` : "[Redacted]";
}

export function maskHostname(host: string): string {
  const labels = host.split(".");
  if (labels.length <= 2 || labels.every((label) => NUMERIC_LABEL.test(label))) {
    return host;
  }

  return [keepLastCharacters(labels[0]), ...labels.slice(1)].join(".");
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
  const customLogLevels = getFromEnv("CUSTOM_LOG_LEVELS", z.string().optional());
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

class JSONReporter {
  constructor(private readonly strict: boolean) {}

  log(logObj: LogObject) {
    // used only in node environment
    const line = JSONstringify(logObj);
    process.stdout.write((this.strict ? line : unescapeString(line)) + "\n");
  }
}
