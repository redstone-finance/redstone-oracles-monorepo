import { Provider } from "@ethersproject/abstract-provider";
import { CronAgent } from "@redstone-finance/agents";
import { NetworkId, NetworkIdSchema, RedstoneCommon } from "@redstone-finance/utils";

export type BackgroundBlockNumbersFetcherOpts = {
  blockNumbersFetchers: [NetworkId, IGetBlockNumber][];
  timeout: number;
  maxTTL: number;
  cronExpression: string;
};

type IGetBlockNumber = Pick<Provider, "getBlockNumber">;

export class BackgroundBlockNumberFetcher {
  agentPerNetworkId: Record<NetworkId, CronAgent<number>> = {};

  constructor(private readonly opts: BackgroundBlockNumbersFetcherOpts) {
    for (const [networkId, blockNumberFetcher] of this.opts.blockNumbersFetchers) {
      const jobWithRetries = RedstoneCommon.retry({
        fn: () => blockNumberFetcher.getBlockNumber(),
        maxRetries: 1,
        waitBetweenMs: 50,
      });
      const agent = new CronAgent({
        job: jobWithRetries,
        name: `background-block-number-fetcher-${networkId}`,
        timeout: this.opts.timeout,
        maxDataTTL: this.opts.maxTTL,
        cronExpression: this.opts.cronExpression,
      });
      this.agentPerNetworkId[networkId] = agent;
    }
  }

  start(): Promise<boolean[]> {
    return Promise.all(Object.values(this.agentPerNetworkId).map((agent) => agent.start()));
  }

  stop() {
    Object.values(this.agentPerNetworkId).forEach((agent) => agent.stop());
  }

  getBlockNumbers(): Record<NetworkId, number | undefined> {
    const blockNumbersPerNetworkId: Record<NetworkId, number | undefined> = {};

    for (const [networkId, agent] of Object.entries(this.agentPerNetworkId)) {
      const blockNumber = agent.getLastFreshMessageOrDefault();

      if (blockNumber !== undefined) {
        blockNumbersPerNetworkId[NetworkIdSchema.parse(networkId)] = blockNumber;
      }
    }

    return blockNumbersPerNetworkId;
  }
}
