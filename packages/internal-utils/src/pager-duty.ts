import { RedstoneCommon } from "@redstone-finance/utils";
import axios from "axios";
import { ErrorSeverity } from "./aws/lambda";

export interface PagerDutyMessageSaver {
  saveMessageData(message: string, severity: string, alertId?: string): Promise<void>;
}

interface PagerDutyResponse {
  status: string;
  dedup_key: string;
  message: string;
}

const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 10,
  waitBetweenMs: 100,
  backOff: {
    backOffBase: 1.5,
  },
};

const SEVERITY_PRIORITIES: Record<ErrorSeverity, number> = {
  critical: 0,
  error: 1,
  warning: 2,
  info: 3,
};

export const isLowImportance = (severity: ErrorSeverity | undefined) =>
  severity === "warning" || severity === "info";

export const getMaxSeverity = (severities: ErrorSeverity[]): ErrorSeverity | undefined => {
  if (severities.length === 0) {
    return undefined;
  }

  let result = severities[0];
  for (const severity of severities) {
    if (SEVERITY_PRIORITIES[severity] < SEVERITY_PRIORITIES[result]) {
      result = severity;
    }
  }

  return result;
};

export async function sendPagerDutyMessage(
  dbService: PagerDutyMessageSaver | undefined,
  pagerDutyIntegrationKey: string,
  message: string,
  severity: ErrorSeverity,
  pagerSource: string,
  group?: string,
  dedupKey?: string
) {
  const MAX_MESSAGE_LENGTH = 1023;
  const trimmedMessage =
    message.length > MAX_MESSAGE_LENGTH ? message.substring(0, MAX_MESSAGE_LENGTH) : message;

  const url = `https://events.eu.pagerduty.com/v2/enqueue`;
  const data = {
    payload: {
      severity,
      group,
      summary: trimmedMessage,
      source: pagerSource,
      custom_details: {
        details: message,
      },
    },
    routing_key: pagerDutyIntegrationKey,
    event_action: "trigger",
    dedup_key: dedupKey,
  };

  try {
    const result = await RedstoneCommon.retry({
      fn: () => axios.post<PagerDutyResponse>(url, data),
      ...RETRY_CONFIG,
    })();

    if (!isLowImportance(severity)) {
      const alertId = result.data.dedup_key;
      await dbService?.saveMessageData(message, severity, alertId);
    }
  } catch (e) {
    console.error(
      `Encountered an error when trying to send pagerduty alert: ${RedstoneCommon.stringifyError(e)}`
    );
    await dbService?.saveMessageData(message, severity);
  }
}
