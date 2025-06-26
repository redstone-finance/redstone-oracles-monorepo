import { NetworkId } from "../NetworkId";
import { CuratedRpcList } from "../curated-list";
import { FnBox, FnDelegate } from "./FnBox";
import { FnDelegateConfig } from "./config";

const MIN_PROVIDER_COUNT = 1;
const MIN_REFRESH_TIME_INTERVAL_MS = 5;

export class QuarantinedListFnDelegate implements FnDelegate {
  private curatedList: CuratedRpcList;
  private lastListUpdateTimestamp: number;
  private healthyIdentifiers: string[];

  private static configCache: {
    [p: string]: FnDelegateConfig | undefined;
  } = {};

  static getCachedConfig(rpcUrls: string[], networkId: NetworkId) {
    const key = [networkId, ...rpcUrls].join("|");

    this.configCache[key] ??= {
      descriptions: rpcUrls,
      delegate: new QuarantinedListFnDelegate(rpcUrls, networkId),
    };

    return this.configCache[key];
  }

  constructor(
    identifiers: string[],
    networkId: NetworkId,
    minimalProvidersCount = MIN_PROVIDER_COUNT
  ) {
    this.lastListUpdateTimestamp = 0;
    this.healthyIdentifiers = identifiers;
    this.curatedList = new CuratedRpcList(
      {
        rpcIdentifiers: identifiers,
        minimalProvidersCount,
        extendedLogs: true,
      },
      networkId
    );
  }

  didFail<R>(fnBox: FnBox<R>) {
    if (!fnBox.description) {
      return;
    }

    this.curatedList.scoreRpc(fnBox.description, { error: true });
  }

  didSucceed<R>(fnBox: FnBox<R>) {
    if (!fnBox.description) {
      return;
    }

    this.curatedList.scoreRpc(fnBox.description, { error: false });
  }

  isQuarantined<R>(fnBox: FnBox<R>) {
    if (!fnBox.description) {
      return false;
    }

    const healthyIdentifiers = this.getHealthyIdentifiers();

    return !healthyIdentifiers.includes(fnBox.description);
  }

  private getHealthyIdentifiers() {
    const now = Date.now();
    if (this.lastListUpdateTimestamp + MIN_REFRESH_TIME_INTERVAL_MS < now) {
      this.healthyIdentifiers = this.curatedList.getBestProviders();
      this.lastListUpdateTimestamp = now;
    }

    return this.healthyIdentifiers;
  }
}
