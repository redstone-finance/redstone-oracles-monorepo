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
  HIP3_FAILED_TO_FETCH_DATA_FROM_PROPOSER = "HIP3_FAILED_TO_FETCH_DATA_FROM_PROPOSER",
  HIP3_NO_VALUE_FOR_CAPPING = "HIP3_FAILED_TOGET_VALUE_FOR_CAPPING",
  MQTT_FALLBACK_USED = "MQTT_FALLBACK_USED",
  PUB_SUB_TOPIC_RATE_LIMITED = "PUB_SUB_TOPIC_RATE_LIMITED",
  PUB_SUB_CLIENT_RATE_LIMITED = "PUB_SUB_CLIENT_RATE_LIMITED",
  UNEXPECTED_ERROR = "UNEXPECTED_ERROR",
  NOT_ENOUGH_SAMPLES_FOR_HIP3_EMA = "NOT_ENOUGH_SAMPLES_FOR_HIP3_EMA",
  WORKER_TIMEOUT = "WORKER_TIMEOUT",
  NO_WORKERS_IN_POOL = "NO_WORKERS_IN_POOL",
}

const defaultLogger = loggerFactory("LogMonitoring");

export class LogMonitoring {
  static error(type: LogMonitoringType, message: string, logger: RedstoneLogger = defaultLogger) {
    logger.error(this.prefixedMessage(type, message));
  }

  static warn(type: LogMonitoringType, message: string, logger: RedstoneLogger = defaultLogger) {
    logger.warn(this.prefixedMessage(type, message));
  }

  static throw(type: LogMonitoringType, message: string) {
    defaultLogger.error(this.prefixedMessage(type, message));
    throw new Error(this.prefixedMessage(type, message));
  }

  static encodePriceSymbol(symbol: string) {
    return `<|${symbol}|>`;
  }

  private static prefixedMessage(type: LogMonitoringType, message: string): string {
    return `${LOG_MONITORING_PREFIX}_${type}: ${message}`;
  }
}
