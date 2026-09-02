import { ChainTypeEnum, MultiExecutor } from "@redstone-finance/utils";
import { Cluster, Commitment, Connection, ConnectionConfig } from "@solana/web3.js";
import { makeAgentFetch } from "./agent-fetch";
import { connectToCluster } from "./cluster";
import { getSolanaChainId, getSolanaCluster } from "./network-ids";
import { RedStoneConnection } from "./RedStoneConnection";
import { API_TYPE_JITO, SolanaApi } from "./SolanaApi";
import { SolanaRpcOpNormalizer } from "./SolanaRpcOpNormalizer";

type HttpAgent = Exclude<ConnectionConfig["httpAgent"], false | undefined>;

export class SolanaConnectionBuilder extends MultiExecutor.ClientBuilder<Connection> {
  protected override chainType = ChainTypeEnum.enum.solana;
  protected override telemetryOpNormalizer = new SolanaRpcOpNormalizer();
  private shouldUseRedStoneConnection = false;
  private httpAgent?: HttpAgent;

  withHttpAgent(httpAgent?: HttpAgent) {
    this.httpAgent = httpAgent;

    return this;
  }

  withCluster(cluster: Cluster) {
    return this.withChainId(getSolanaChainId(cluster));
  }

  withRedStoneConnection(enabled = true) {
    this.shouldUseRedStoneConnection = enabled;

    return this;
  }

  build(): Connection {
    if (!this.chainId) {
      throw new Error("Network not set");
    }

    if (!this.getEligibleUrls().length) {
      return connectToCluster(getSolanaCluster(this.chainId));
    }

    return this.makeMultiExecutor((url) => this.makeConnection(url), {
      getBlockHeight: SolanaConnectionBuilder.blockNumberConsensusExecutor,
      getSlot: SolanaConnectionBuilder.blockNumberConsensusExecutor,
      getLatestBlockhash: MultiExecutor.ExecutionMode.AGREEMENT,
    });
  }

  protected override getEligibleUrls() {
    return this.urls.filter((url) => SolanaApi.parseUrl(url).type !== API_TYPE_JITO);
  }

  private makeConnection(url: string) {
    const commitmentOrConfig = {
      commitment: "confirmed" as Commitment,
      disableRetryOnRateLimit: true,
      ...(this.httpAgent && { fetch: makeAgentFetch(this.httpAgent) }),
    };

    if (this.shouldUseRedStoneConnection) {
      return RedStoneConnection.instanceForUrl(url, commitmentOrConfig);
    }

    return new Connection(url, commitmentOrConfig);
  }
}
