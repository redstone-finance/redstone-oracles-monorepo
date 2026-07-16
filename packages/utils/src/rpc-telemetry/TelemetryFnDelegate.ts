import { isDefined } from "../common";
import { sanitizeLogMessage } from "../logger";
import type { FnBox, FnDelegate } from "../multi-executor";
import { NetworkId } from "../NetworkId";
import { RpcOpNormalizer, RpcOpTelemetry } from "./RpcOpNormalizer";

export type RpcCallMetric = RpcOpTelemetry & {
  method: string;
  networkId: NetworkId;
  url: string;
  durationMs: number;
  isFailure: boolean;
};

export type RpcMetricReporter = (metric: RpcCallMetric) => void;

export class TelemetryFnDelegate implements FnDelegate {
  constructor(
    private readonly networkId: NetworkId,
    private readonly report: RpcMetricReporter,
    private readonly normalizer = new RpcOpNormalizer()
  ) {}

  didSucceed<R>(fnBox: FnBox<R>, result: R, durationMs: number) {
    this.reportMetric(fnBox, durationMs, false, result);
  }

  didFail<R>(fnBox: FnBox<R>, _error: unknown, durationMs: number) {
    this.reportMetric(fnBox, durationMs, true);
  }

  private reportMetric<R>(fnBox: FnBox<R>, durationMs: number, isFailure: boolean, result?: R) {
    const url = fnBox.description;
    if (!isDefined(url)) {
      return;
    }

    const { op, value } = this.normalizer.normalize(fnBox.name, result);
    this.report({
      op,
      value,
      method: fnBox.name,
      networkId: this.networkId,
      url: sanitizeLogMessage(url),
      durationMs,
      isFailure,
    });
  }
}
