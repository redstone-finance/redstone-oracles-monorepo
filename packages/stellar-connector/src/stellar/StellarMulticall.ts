import { InvocationV0, InvocationV1, StellarRouterSdk } from "@creit-tech/stellar-router-sdk";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";
import { IStellarCaller, StellarInvocation } from "../IStellarCaller";
import { StellarNetwork } from "./network-ids";

const MAX_NUMBER_OF_CALLS = 10;
const DEFAULT_COLLECTING_INTERVAL_MS = 10;
const TESTNET_MULTICALL_ADDRESS = "CBM4TX2P6JAKDJ3RJEYZUXDQVGMYRFX5KGW2XMVHTZ4E3RF7D54F3TMD";

export class StellarMulticall implements IStellarCaller {
  private static instanceForUrls: { [p: string]: StellarMulticall | undefined } = {};

  static instanceForUrl(rpcUrl: string, network: StellarNetwork) {
    // Default for mainnet
    const multicallAddress = network === "mainnet" ? undefined : TESTNET_MULTICALL_ADDRESS;

    StellarMulticall.instanceForUrls[rpcUrl] ??= new StellarMulticall(rpcUrl, multicallAddress);

    return StellarMulticall.instanceForUrls[rpcUrl];
  }

  private readonly router: StellarRouterSdk;

  private waitingEntries: {
    invocation: InvocationV0 | InvocationV1;
    transform: (value: unknown) => unknown;
    resolve: (value: unknown) => void;
    reject: (err: unknown) => void;
  }[] = [];

  private logger = loggerFactory("stellar-multicall");
  private timer?: NodeJS.Timeout;

  constructor(
    readonly rpcUrl: string,
    routerContract?: string,
    private readonly collectingIntervalMs = DEFAULT_COLLECTING_INTERVAL_MS
  ) {
    this.router = new StellarRouterSdk({ rpcUrl, routerContract });
  }

  async call<T>(
    invocation: StellarInvocation,
    _blockNumber?: number,
    transform = (retVal: unknown) => retVal as T
  ): Promise<T> {
    const operation = new InvocationV0({
      ...invocation,
      contract: invocation.contract.contractId(),
      args: invocation.args ?? [],
    });

    return await new Promise((resolve, reject) => {
      this.waitingEntries.push({
        invocation: operation,
        resolve: resolve as (retVal: unknown) => void,
        reject,
        transform: transform,
      });
      this.timer ??= setTimeout(
        () =>
          void this.consumeWaitingEntries().catch((e) =>
            this.logger.error(`consumeWaitingEntries failed: ${RedstoneCommon.stringifyError(e)}`)
          ),
        this.collectingIntervalMs
      );
    });
  }

  protected async consumeWaitingEntries() {
    const entries = this.waitingEntries;
    this.waitingEntries = [];
    this.clearTimer();

    const chunks = _.chunk(entries, MAX_NUMBER_OF_CALLS);

    try {
      const chunkPromises = chunks.map((chunk) => {
        this.logger.info(
          `Simulating call for ${chunk.length} invocation${RedstoneCommon.getS(chunk.length)}`
        );

        return this.router.simResult<[unknown]>(chunk.map((ch) => ch.invocation));
      });
      const allResults = (await Promise.all(chunkPromises)).flat();

      _.zip(entries, allResults).forEach(([entry, result]) =>
        entry!.resolve(entry!.transform(result))
      );
    } catch (err) {
      entries.forEach((entry) => entry.reject(err));
    }
  }

  dispose() {
    this.clearTimer();

    const error = new Error("StellarMulticall disposed");

    for (const entry of this.waitingEntries) {
      try {
        entry.reject(error);
      } catch (e) {
        this.logger.warn(`dispose reject error: ${RedstoneCommon.stringifyError(e)}`);
      }
    }

    this.waitingEntries = [];
  }

  private clearTimer() {
    clearTimeout(this.timer);
    this.timer = undefined;
  }
}
