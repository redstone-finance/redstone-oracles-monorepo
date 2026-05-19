import { InvocationV0, StellarRouterSdk } from "@creit-tech/stellar-router-sdk";
import { Collector } from "@redstone-finance/utils";
import { IStellarCaller, IStellarCallerDelegate, StellarInvocation } from "../IStellarCaller";
import { SimulationCollector, StellarKey } from "./SimulationCollector";
import { StellarNetwork } from "./network-ids";

const DEFAULT_COLLECTING_INTERVAL_MS = 10;
const TESTNET_MULTICALL_ADDRESS = "CBM4TX2P6JAKDJ3RJEYZUXDQVGMYRFX5KGW2XMVHTZ4E3RF7D54F3TMD";

export class StellarMulticall implements IStellarCaller {
  private static instanceForUrls: { [p: string]: StellarMulticall | undefined } = {};

  static instanceForUrl(rpcUrl: string, network: StellarNetwork) {
    const multicallAddress = network === "mainnet" ? undefined : TESTNET_MULTICALL_ADDRESS;

    StellarMulticall.instanceForUrls[rpcUrl] ??= new StellarMulticall(rpcUrl, multicallAddress);

    return StellarMulticall.instanceForUrls[rpcUrl];
  }

  delegateClient?: WeakRef<IStellarCallerDelegate>;

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
      (blockNumber?: number) =>
        new SimulationCollector(
          this.router,
          () => this.delegateClient?.deref(),
          rpcUrl,
          blockNumber,
          collectingIntervalMs
        )
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

  dispose() {
    this.collectors.disposeAll();
  }
}
