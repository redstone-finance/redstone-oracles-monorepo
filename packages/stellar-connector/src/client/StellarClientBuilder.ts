import { ChainTypeEnum, MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { Horizon, rpc } from "@stellar/stellar-sdk";
import { getStellarChainId, NETWORK_NAMES, StellarNetwork } from "../stellar/network-ids";
import { HorizonClient } from "./HorizonClient";
import { API_TYPE_HORIZON, StellarApi } from "./StellarApi";
import { StellarClient } from "./StellarClient";
import { StellarMulticall } from "./StellarMulticall";
import { StellarRpcOpNormalizer } from "./StellarRpcOpNormalizer";

const PUBLIC_HORIZON_URLS: Partial<Record<StellarNetwork, string>> = {
  mainnet: "https://horizon.stellar.org",
  testnet: "https://horizon-testnet.stellar.org",
};

export class StellarClientBuilder extends MultiExecutor.ClientBuilder<StellarClient> {
  private static instances: { [p: string]: StellarClient | undefined } = {};

  protected override chainType = ChainTypeEnum.enum.stellar;
  protected override telemetryOpNormalizer = new StellarRpcOpNormalizer();
  private horizonUrl?: string;
  private isWithMulticall = false;

  withStellarNetwork(network: StellarNetwork) {
    return this.withChainId(getStellarChainId(network));
  }

  withHorizonUrl(horizonUrl?: string) {
    this.horizonUrl = horizonUrl;

    return this;
  }

  withMulticall(withMulticall = true) {
    this.isWithMulticall = withMulticall;

    return this;
  }

  build() {
    if (!this.chainId) {
      throw new Error("Network not set");
    }

    const horizon = this.buildHorizonClient();

    return this.makeMultiExecutor(
      (url) => StellarClientBuilder.getStellarClient(this, url, horizon),
      {
        getBlockNumber: new MultiExecutor.CeilMedianConsensusExecutor(
          MultiExecutor.DEFAULT_CONFIG.consensusQuorumRatio,
          MultiExecutor.BLOCK_NUMBER_EXECUTION_TIMEOUT_MS * 2
        ),
        sendTransaction: MultiExecutor.ExecutionMode.RACE,
        simulateOperation: MultiExecutor.ExecutionMode.AGREEMENT,
        getAccountBalance: MultiExecutor.ExecutionMode.AGREEMENT,
        getContractEntries: MultiExecutor.ExecutionMode.MULTI_AGREEMENT,
        getTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
        waitForTx: MultiExecutor.ExecutionMode.AGREEMENT,
        call: MultiExecutor.ExecutionMode.AGREEMENT,
      }
    );
  }

  protected override getEligibleUrls() {
    return this.urls.filter((url) => StellarApi.parseUrl(url).type !== API_TYPE_HORIZON);
  }

  private getHorizonUrls() {
    const horizonApis = RedstoneCommon.splitUrls(this.urls, (urlString) =>
      StellarApi.parseUrl(urlString)
    )[API_TYPE_HORIZON];
    const urls = horizonApis?.map((api) => api.baseUrl) ?? [];

    if (RedstoneCommon.isDefined(this.horizonUrl)) {
      urls.unshift(this.horizonUrl);
    }

    if (!urls.length) {
      const publicUrl = PUBLIC_HORIZON_URLS[NETWORK_NAMES[this.chainId!]];

      return RedstoneCommon.isDefined(publicUrl) ? [publicUrl] : [];
    }

    return urls;
  }

  private buildHorizonClient() {
    const urls = this.getHorizonUrls();

    if (!urls.length) {
      return undefined;
    }

    return MultiExecutor.create(
      urls.map((url) => new HorizonClient(new Horizon.Server(url, { allowHttp: true }))),
      {
        getNetworkStats: MultiExecutor.ExecutionMode.FALLBACK,
        getPayments: MultiExecutor.ExecutionMode.FALLBACK,
        getOperations: MultiExecutor.ExecutionMode.FALLBACK,
      }
    );
  }

  private static getStellarClient(
    builder: StellarClientBuilder,
    url: string,
    horizon?: HorizonClient
  ) {
    const networkName = NETWORK_NAMES[builder.chainId!];
    const key = `${networkName}#${url}#${builder.getHorizonUrls().join(",")}#${builder.isWithMulticall}`;

    this.instances[key] ??= this.getStellarClientInstance(url, networkName, builder, horizon);

    return this.instances[key];
  }

  private static getStellarClientInstance(
    url: string,
    networkName: StellarNetwork,
    builder: StellarClientBuilder,
    horizon?: HorizonClient
  ) {
    const multicall = builder.isWithMulticall
      ? StellarMulticall.instanceForUrl(url, networkName)
      : undefined;
    const client = new StellarClient(new rpc.Server(url, { allowHttp: true }), horizon, multicall);

    if (multicall) {
      multicall.delegateClient = new WeakRef(client);
    }

    return client;
  }
}
