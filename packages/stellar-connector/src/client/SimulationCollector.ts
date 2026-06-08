import { InvocationV0, InvocationV1 } from "@creit-tech/stellar-router-sdk";
import { Collector } from "@redstone-finance/utils";
import { StellarInvocation } from "./IStellarCaller";

const MAX_NUMBER_OF_CALLS = 15;

export type StellarKey = {
  baseInvocation: StellarInvocation;
  invocation: InvocationV0 | InvocationV1;
};

export type SimulationCollectorDelegate = {
  simulationCollectorSimulate(keys: StellarKey[], blockNumber?: number): Promise<unknown[]>;
  simulationCollectorDispose?(blockNumber?: number): void;
};

export class SimulationCollector extends Collector.RequestCollector<StellarKey, unknown> {
  delegate?: WeakRef<SimulationCollectorDelegate>;

  constructor(
    collectingIntervalMs: number,
    private readonly blockNumber?: number
  ) {
    super("stellar-multicall", MAX_NUMBER_OF_CALLS, collectingIntervalMs, blockNumber);
  }

  protected override keyToString({ invocation }: StellarKey) {
    const argsHash = invocation.args.map((a) => a.toXDR("base64")).join(",");

    return `${invocation.contract.toString()}::${invocation.method}::${argsHash}`;
  }

  protected override async fetchBatch(keys: StellarKey[]) {
    const delegate = this.delegate?.deref();

    if (!delegate) {
      throw new Error("Delegate not set - delegate is empty");
    }

    return await delegate.simulationCollectorSimulate(keys, this.blockNumber);
  }

  protected override onIdle() {
    this.delegate?.deref()?.simulationCollectorDispose?.(this.blockNumber);
  }
}
