import { loggerFactory, RedstoneLogger } from "@redstone-finance/utils";

const LOG_MONITORING_PREFIX = "LOG_MONITORING";

export enum LogMonitoringType {
  SOFT_TTL_EXCEEDED = "SOFT_TTL_EXCEEDED",
  VALUE_OUT_OF_HARD_LIMITS = "VALUE_OUT_OF_HARD_LIMITS",
  VALUE_VIOLATES_UPPER_CAP_LIMIT = "VALUE_VIOLATES_UPPER_CAP_LIMIT",
  VALUE_VIOLATES_LOWER_CAP_LIMIT = "VALUE_VIOLATES_LOWER_CAP_LIMIT",
  FAILED_POR_REQUEST = "FAILED_POR_REQUEST",
  NODE_RUNNING_ON_BACKUP_CONFIG = "NODE_RUNNING_ON_BACKUP_CONFIG",
  DAILY_DEVIATION_CAP_CROSSED = "DAILY_DEVIATION_CAP_CROSSED",
  MQTT_FALLBACK_USED = "MQTT_FALLBACK_USED",
  PUB_SUB_TOPIC_RATE_LIMITED = "PUB_SUB_TOPIC_RATE_LIMITED",
  PUB_SUB_CLIENT_RATE_LIMITED = "PUB_SUB_CLIENT_RATE_LIMITED",
  UNEXPECTED_ERROR = "UNEXPECTED_ERROR",
  // HIP3
  HIP3_DELIVERING_STALE_DATA = "HIP3_DELIVERING_STALE_DATA",
  HIP3_FAILED_TO_FETCH_DATA_FROM_PROPOSER = "HIP3_FAILED_TO_FETCH_DATA_FROM_PROPOSER",
  HIP3_FAILED_TO_FETCH_DATA_FROM_BOTH_PROPOSERS = "HIP3_FAILED_TO_FETCH_DATA_FROM_BOTH_PROPOSERS",
  HIP3_NO_VALUE_FOR_CAPPING = "HIP3_NO_VALUE_FOR_CAPPING",
  HIP3_NOT_ENOUGH_SAMPLES_FOR_EMA = "HIP3_NOT_ENOUGH_SAMPLES_FOR_EMA",
  HIP3_FAILED_TO_FETCH_DEX_META = "HIP3_FAILED_TO_FETCH_DEX_META",
  HIP3_MAX_DEVIATION_BETWEEN_UPDATES_CROSSED = "HIP3_MAX_DEVIATION_BETWEEN_UPDATES_CROSSED",
  // when fallback is activated but we get nonce duplicated error this means that fallback and main
  // when fallback is activated, but we get nonce duplicated error this means that fallback and main
  // in parallel are trying to deliver data, this SHOULD happen only once when main was down and later
  // get back to life
  HIP3_FALLBACK_NONCE_DUPLICATED = "HIP3_FALLBACK_NONCE_DUPLICATED",
  WORKER_TIMEOUT = "WORKER_TIMEOUT",
  NO_WORKERS_IN_POOL = "NO_WORKERS_IN_POOL",
  CLOSE_TO_MISSING_HOLIDAYS_STOCKS_HIP3 = "CLOSE_TO_MISSING_HOLIDAYS_STOCKS_HIP3",
  UPDATE_OPENING_HOURS_COMMODITY_HIP3 = "UPDATE_OPENING_HOURS_COMMODITY_HIP3",
  UNHANDLED_REJECTION = "UNHANDLED_REJECTION",
  UNCAUGHT_EXCEPTION = "UNCAUGHT_EXCEPTION",
}

const defaultLogger = loggerFactory("LogMonitoring");

export class LogMonitoring {
  static error(type: LogMonitoringType, message: string, logger: RedstoneLogger = defaultLogger) {
    logger.error(this.prefixedMessage(type, message));
  }

  static warn(type: LogMonitoringType, message: string, logger: RedstoneLogger = defaultLogger) {
    logger.warn(this.prefixedMessage(type, message));
  }

  static throw(
    type: LogMonitoringType,
    message: string,
    logger: RedstoneLogger = defaultLogger
  ): never {
    logger.error(this.prefixedMessage(type, message));
    throw new Error(this.prefixedMessage(type, message));
  }

  static encodePriceSymbol(symbol: string) {
    return `<|${symbol}|>`;
  }

  private static prefixedMessage(type: LogMonitoringType, message: string): string {
    return `${LOG_MONITORING_PREFIX}_${type}: ${message}`;
  }
}
