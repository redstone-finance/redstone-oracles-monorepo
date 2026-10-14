import _ from "lodash";
import { NetworkId } from "../NetworkId";
import { memoizeSync } from "../common";
import { CuratedRpcList } from "../curated-list";
import { Eligibility, FnBox, FnDelegate } from "./FnBox";
import { FnDelegateConfig } from "./config";

const MIN_PROVIDER_COUNT = 1;
const MIN_REFRESH_TIME_INTERVAL_MS = 5;

export class QuarantinedListFnDelegate implements FnDelegate {
  private curatedList: CuratedRpcList;
  private readonly bestProviders = memoizeSync({
    functionToMemoize: (eligibleIdentifiers: string[]) =>
      this.curatedList.getBestProviders((rpc) => eligibleIdentifiers.includes(rpc)),
    ttl: MIN_REFRESH_TIME_INTERVAL_MS,
  });

  private static configCache: {
    [p: string]: FnDelegateConfig | undefined;
  } = {};

  static getCachedConfig(
    rpcUrls: string[],
    networkId: NetworkId,
    minimalProviderCount = MIN_PROVIDER_COUNT
  ) {
    const urls = _.uniq(rpcUrls);
    const urlsKey = urls.toSorted();
    const key = [networkId, minimalProviderCount, ...urlsKey].join("|");

    this.configCache[key] ??= {
      descriptions: urls,
      delegate: new QuarantinedListFnDelegate(urls, networkId, minimalProviderCount),
    };

    return this.configCache[key];
  }

  private constructor(
    identifiers: string[],
    networkId: NetworkId,
    minimalProviderCount = MIN_PROVIDER_COUNT
  ) {
    this.curatedList = new CuratedRpcList(
      {
        rpcIdentifiers: identifiers,
        minimalProvidersCount: minimalProviderCount,
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

    const healthyIdentifiers = this.getHealthyIdentifiers(fnBox.isEligible);

    return !healthyIdentifiers.includes(fnBox.description);
  }

  private getHealthyIdentifiers(isEligible?: Eligibility) {
    return this.bestProviders(
      this.curatedList.config.rpcIdentifiers.filter((rpc) => !isEligible || isEligible(rpc))
    );
  }
}
