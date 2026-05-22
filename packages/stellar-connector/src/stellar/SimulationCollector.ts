import { InvocationV0, InvocationV1, StellarRouterSdk } from "@creit-tech/stellar-router-sdk";
import { Collector, loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { scValToNative } from "@stellar/stellar-sdk";
import { IStellarCallerDelegate, StellarInvocation } from "../IStellarCaller";

const MAX_NUMBER_OF_CALLS = 15;

export type StellarKey = {
  baseInvocation: StellarInvocation;
  invocation: InvocationV0 | InvocationV1;
};

export class SimulationCollector extends Collector.RequestCollector<StellarKey, unknown> {
  private readonly chunkLogger = loggerFactory("stellar-multicall");

  constructor(
    private readonly router: StellarRouterSdk,
    private readonly getDelegate: () => IStellarCallerDelegate | undefined,
    private readonly rpcUrl: string,
    private readonly blockNumber: number | undefined,
    collectingIntervalMs: number
  ) {
    super("stellar-multicall", MAX_NUMBER_OF_CALLS, collectingIntervalMs);
  }

  protected override keyToString({ invocation }: StellarKey) {
    const argsHash = invocation.args.map((a) => a.toXDR("base64")).join(",");

    return `${invocation.contract.toString()}::${invocation.method}::${argsHash}`;
  }

  protected override async fetchBatch(keys: StellarKey[]) {
    this.logChunk(keys);

    if (keys.length === 0) {
      return [];
    }

    const delegate = this.getDelegate();
    await delegate?.waitForBlockNumber(this.blockNumber);

    if (keys.length === 1 && delegate) {
      const result = await delegate.simulateInvocation(keys[0].baseInvocation, this.blockNumber);

      return [result];
    }

    return await this.router.simResult<unknown[]>(keys.map((k) => k.invocation));
  }

  private logChunk(chunk: StellarKey[]) {
    const invocations: { [p: string]: string[] | undefined } = {};

    chunk.forEach(({ invocation }) => {
      invocations[invocation.contract.toString()] ??= [];
      const args: unknown[] = invocation.args.map(scValToNative);
      invocations[invocation.contract.toString()]!.push(
        `${invocation.method}(${RedstoneCommon.stringify(args.length > 1 ? args : (args.at(0) ?? "")).replaceAll('"', "")})`
      );
    });

    this.chunkLogger.debug(
      `Simulating call for ${chunk.length} invocation${RedstoneCommon.getS(chunk.length)} at block ${this.blockNumber ?? "latest"} on ${this.rpcUrl}`,
      { invocations }
    );
  }
}
