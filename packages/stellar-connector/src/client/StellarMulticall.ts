import { InvocationV0, StellarRouterSdk } from "@creit-tech/stellar-router-sdk";
import { Collector, loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { scValToNative } from "@stellar/stellar-sdk";
import { StellarNetwork } from "../stellar/network-ids";
import { IStellarCaller, IStellarCallerDelegate, StellarInvocation } from "./IStellarCaller";
import {
  SimulationCollector,
  SimulationCollectorDelegate,
  StellarKey,
} from "./SimulationCollector";

const DEFAULT_COLLECTING_INTERVAL_MS = 100;
const TESTNET_MULTICALL_ADDRESS = "CBM4TX2P6JAKDJ3RJEYZUXDQVGMYRFX5KGW2XMVHTZ4E3RF7D54F3TMD";

export class StellarMulticall implements IStellarCaller, SimulationCollectorDelegate {
  private static instanceForUrls: { [p: string]: StellarMulticall | undefined } = {};

  static instanceForUrl(rpcUrl: string, network: StellarNetwork) {
    const multicallAddress = network === "mainnet" ? undefined : TESTNET_MULTICALL_ADDRESS;

    StellarMulticall.instanceForUrls[rpcUrl] ??= new StellarMulticall(rpcUrl, multicallAddress);

    return StellarMulticall.instanceForUrls[rpcUrl];
  }

  delegateClient?: WeakRef<IStellarCallerDelegate>;

  private readonly chunkLogger = loggerFactory("stellar-multicall");
  private readonly router: StellarRouterSdk;
  private readonly collectors: Collector.CollectorRegistry<number | undefined, StellarKey, unknown>;

  constructor(
    readonly rpcUrl: string,
    routerContract?: string,
    collectingIntervalMs = DEFAULT_COLLECTING_INTERVAL_MS
  ) {
    this.router = new StellarRouterSdk({ rpcUrl, routerContract });
    this.collectors = new Collector.CollectorRegistry(
      (blockNumber?: number) => String(blockNumber ?? "latest"),
      (blockNumber?: number) => {
        const collector = new SimulationCollector(collectingIntervalMs, blockNumber);
        collector.delegate = new WeakRef(this);

        return collector;
      }
    );
  }

  async call<T>(
    baseInvocation: StellarInvocation,
    blockNumber?: number,
    transform = (retVal: unknown) => retVal as T
  ): Promise<T> {
    const invocation = new InvocationV0({
      ...baseInvocation,
      contract: baseInvocation.contract.contractId(),
      args: baseInvocation.args ?? [],
    });

    const result = await this.collectors.get(blockNumber).collect({ baseInvocation, invocation });

    return transform(result);
  }

  /// SimulationCollectorDelegate

  async simulationCollectorSimulate(keys: StellarKey[], blockNumber?: number) {
    this.logChunk(keys, blockNumber);

    if (keys.length === 0) {
      return [];
    }

    const delegate = this.delegateClient?.deref();
    await delegate?.waitForBlockNumber(blockNumber);

    if (keys.length === 1 && delegate) {
      const result = await delegate.simulateInvocation(keys[0].baseInvocation, blockNumber);

      return [result];
    }

    return await this.router.simResult<unknown[]>(keys.map((k) => k.invocation));
  }

  simulationCollectorDispose(blockNumber?: number) {
    if (RedstoneCommon.isDefined(blockNumber)) {
      this.collectors.delete(blockNumber);
    }
  }

  dispose() {
    this.collectors.disposeAll();
  }

  private logChunk(chunk: StellarKey[], blockNumber?: number) {
    const invocations: { [p: string]: string[] | undefined } = {};

    chunk.forEach(({ invocation }) => {
      invocations[invocation.contract.toString()] ??= [];
      const args: unknown[] = invocation.args.map(scValToNative);
      invocations[invocation.contract.toString()]!.push(
        `${invocation.method}(${RedstoneCommon.stringify(args.length > 1 ? args : (args.at(0) ?? "")).replaceAll('"', "")})`
      );
    });

    this.chunkLogger.debug(
      `Simulating call for ${RedstoneCommon.getNS(chunk.length, "invocation")} at block ${blockNumber ?? "latest"} on ${this.rpcUrl}`,
      { invocations }
    );
  }
}
