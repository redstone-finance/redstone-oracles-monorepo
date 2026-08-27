import _ from "lodash";
import { minToMs } from "../common";
import { NetworkId } from "../NetworkId";
import { FnDelegateConfig } from "./config";
import { FnBox, FnDelegate } from "./FnBox";

type ScoreEntry = {
  rate: number;
  healTimer?: NodeJS.Timeout;
};

const MAX_SUCCESS_RATE = 1;
const UNKNOWN_SUCCESS_RATE = MAX_SUCCESS_RATE;
const RECENT_CALL_WEIGHT = 0.02;
const RECOVERY_PER_INTERVAL = 0.1;
const RECOVERY_INTERVAL_MS = minToMs(1);

export class SuccessRateFnDelegate implements FnDelegate {
  private readonly successRates = new Map<string, ScoreEntry>();

  private static configCache: {
    [p: string]: FnDelegateConfig | undefined;
  } = {};

  private constructor() {}

  static getCachedConfig(rpcUrls: string[], networkId: NetworkId) {
    const urls = _.uniq(rpcUrls);
    const key = [networkId, ...urls.toSorted()].join("|");

    this.configCache[key] ??= {
      descriptions: urls,
      delegate: new SuccessRateFnDelegate(),
    };

    return this.configCache[key];
  }

  didFail<R>(fnBox: FnBox<R>) {
    this.record(fnBox, true);
  }

  didSucceed<R>(fnBox: FnBox<R>) {
    this.record(fnBox, false);
  }

  order<R>(fnBoxes: FnBox<R>[]) {
    return _.sortBy(fnBoxes, (fnBox) => -this.successRate(fnBox));
  }

  dispose() {
    for (const { healTimer } of this.successRates.values()) {
      clearInterval(healTimer);
    }
    this.successRates.clear();
  }

  private successRate<R>(fnBox: FnBox<R>) {
    return (
      (fnBox.description ? this.successRates.get(fnBox.description)?.rate : undefined) ??
      UNKNOWN_SUCCESS_RATE
    );
  }

  private record<R>(fnBox: FnBox<R>, failed: boolean) {
    const { description } = fnBox;
    if (!description) {
      return;
    }

    const outcome = failed ? 0 : 1;
    const rate = this.successRate(fnBox) * (1 - RECENT_CALL_WEIGHT) + outcome * RECENT_CALL_WEIGHT;

    this.update(description, rate);
  }

  private update(description: string, rate: number) {
    let entry = this.successRates.get(description);

    if (rate >= MAX_SUCCESS_RATE) {
      if (entry) {
        entry.rate = rate;
        clearInterval(entry.healTimer);
        entry.healTimer = undefined;
      }

      return;
    }

    if (!entry) {
      entry = { rate };
      this.successRates.set(description, entry);
    }

    entry.rate = rate;
    entry.healTimer ??= setInterval(() => this.heal(description), RECOVERY_INTERVAL_MS).unref();
  }

  private heal(description: string) {
    const entry = this.successRates.get(description);
    if (!entry) {
      return;
    }
    this.update(description, entry.rate + RECOVERY_PER_INTERVAL);
  }
}
