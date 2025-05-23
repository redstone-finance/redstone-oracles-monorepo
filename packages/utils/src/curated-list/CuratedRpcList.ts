import { z } from "zod";
import { assert, getFromEnv } from "../common";
import { loggerFactory, RedstoneLogger } from "../logger";
import { weightedRandom } from "../math";

type Score = {
  callsCount: number;
  errorsCount: number;
  inQuarantine: boolean;
  quarantineCounter: number;
};

type ScoreReport = {
  error: boolean;
};

const CuratedRpcListConfigSchema = z.object({
  resetQuarantineInterval: z.number().default(() =>
    getFromEnv(
      "RPC_CURATED_LIST_RESET_QUARANTINE_INTERVAL",
      z.number().default(60_000) // every 1 min
    )
  ),
  evaluationInterval: z.number().default(() =>
    getFromEnv(
      "RPC_CURATED_LIST_EVALUATION_INTERVAL",
      z.number().default(30_000) // every 30 seconds
    )
  ),
  maxErrorRate: z
    .number()
    .min(0)
    .max(1)
    .default(() =>
      getFromEnv(
        "RPC_CURATED_LIST_MAX_ERROR_RATE",
        z.number().default(0.15) // 15%
      )
    ),
  extendedLogs: z
    .boolean()
    .default(() =>
      getFromEnv("RPC_CURATED_LIST_EXTENDED_LOGS", z.boolean().default(false))
    ),
  rpcIdentifiers: z.string().array().min(1),
  minimalProvidersCount: z.number(),
});

export type CuratedRpcListConfig = z.input<typeof CuratedRpcListConfigSchema>;

export type RpcIdentifier = string;

export class CuratedRpcList {
  config: Required<CuratedRpcListConfig>;
  state: { [rpcIdentifier: RpcIdentifier]: Score } = {};
  logger: RedstoneLogger;

  constructor(config: CuratedRpcListConfig, chainId: number | string) {
    this.config = CuratedRpcListConfigSchema.parse(config);
    assert(
      this.config.minimalProvidersCount <= this.config.rpcIdentifiers.length,
      `A minimalProvidersCount can't be bigger than supplied rpcs list length`
    );
    this.logger = loggerFactory(`curated-rpc-list-${chainId}`);

    for (const rpc of config.rpcIdentifiers) {
      assert(
        !this.state[rpc],
        `You have passed duplicated rpc identifier=${rpc} to curated rpc list`
      );
      this.state[rpc] = {
        callsCount: 0,
        errorsCount: 0,
        inQuarantine: false,
        quarantineCounter: 0,
      };
    }

    setInterval(() => {
      this.config.rpcIdentifiers.map((rpc) => this.evaluateRpcScore(rpc));
    }, this.config.evaluationInterval);

    setInterval(
      () => this.freeOneRpcFromQuarantine(),
      this.config.resetQuarantineInterval
    );
  }

  scoreRpc(rpc: RpcIdentifier, score: ScoreReport): void {
    this.state[rpc].callsCount += 1;
    this.state[rpc].errorsCount += score.error ? 1 : 0;
  }

  evaluateRpcScore(rpc: RpcIdentifier): void {
    const stats = this.state[rpc];
    const errorRate = stats.errorsCount / stats.callsCount;
    if (errorRate > this.config.maxErrorRate) {
      stats.inQuarantine = true;
      stats.quarantineCounter += 1;
      (this.config.extendedLogs ? this.logger.info : this.logger.debug)(
        `Sending provider with identifier=${rpc} to quarantine; errorRate=${errorRate.toFixed(
          2
        )}`
      );
    }
    stats.callsCount = 0;
    stats.errorsCount = 0;
  }

  getBestProviders(): RpcIdentifier[] {
    const healthyProviders = Object.entries(this.state)
      .filter(([_, { inQuarantine }]) => !inQuarantine)
      .map(([rpc]) => rpc);

    if (healthyProviders.length < this.config.minimalProvidersCount) {
      this.logger.warn(
        `Not enough healthy providers, have to release one from quarantine`
      );
      this.freeOneRpcFromQuarantine();
      return this.getBestProviders();
    }

    return healthyProviders;
  }

  freeOneRpcFromQuarantine(): void {
    const providersInQuarantine = Object.entries(this.state).filter(
      ([_, { inQuarantine }]) => inQuarantine
    );

    const weights = providersInQuarantine.map(
      (v) => 1 / v[1].quarantineCounter
    );

    const index = weightedRandom(weights);

    if (index >= 0) {
      providersInQuarantine[index][1].inQuarantine = false;
      (this.config.extendedLogs ? this.logger.info : this.logger.debug)(
        `Releasing provider identifier=${providersInQuarantine[index][0]} from quarantine`
      );
    }
  }
}
