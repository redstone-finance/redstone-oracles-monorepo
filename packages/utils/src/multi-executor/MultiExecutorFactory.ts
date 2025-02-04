import { timeoutOrResult } from "../common";
import {
  AllEqualsConsensusExecutor,
  MedianConsensusExecutor,
} from "./ConsensusExecutor";
import { Executor } from "./Executor";
import { FallbackExecutor } from "./FallbackExecutor";
import { RaceExecutor } from "./RaceExecutor";
import { ExecutionMode, MethodConfig, MultiExecutorConfig } from "./create";

export class MultiExecutorFactory<T extends object> {
  constructor(
    private instances: T[],
    private methodConfig: MethodConfig<T>,
    private config: MultiExecutorConfig
  ) {}

  private getMethodMode(methodName: keyof T) {
    return this.methodConfig[methodName] ?? this.config.defaultMode;
  }

  private getExecutor(mode: ExecutionMode | Executor): Executor {
    if (mode instanceof Executor) {
      return mode;
    }

    switch (mode) {
      case ExecutionMode.RACE:
        return new RaceExecutor();
      case ExecutionMode.FALLBACK:
        return new FallbackExecutor(this.config.singleExecutionTimeoutMs);
      case ExecutionMode.CONSENSUS_MEDIAN:
        return new MedianConsensusExecutor(this.config.quorumRatio);
      case ExecutionMode.CONSENSUS_ALL_EQUALS:
        return new AllEqualsConsensusExecutor(this.config.quorumRatio);
      default:
        throw new Error(`Unknown execution mode: ${String(mode)}`);
    }
  }

  createProxy(): T {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;

    return new Proxy(this.instances[0], {
      get(target: T, prop: string | symbol): unknown {
        const key = prop as keyof T;
        const method = target[key];

        if (typeof method !== "function") {
          return method;
        }

        if (
          method.constructor.name === "AsyncFunction" ||
          method.toString().includes("Promise")
        ) {
          return async function (...args: unknown[]): Promise<unknown> {
            const promises = that.instances.map(
              (instance) => () =>
                Promise.resolve(
                  (instance[key] as (...args: unknown[]) => unknown).call(
                    instance,
                    ...args
                  )
                )
            );

            const mode = that.getMethodMode(key);
            const result = that.getExecutor(mode).execute(promises);

            return await timeoutOrResult(
              result,
              that.config.allExecutionsTimeoutMs
            );
          };
        }

        return function (...args: unknown[]): unknown {
          return (target[key] as (...args: unknown[]) => unknown).call(
            target,
            ...args
          );
        };
      },
    });
  }
}
