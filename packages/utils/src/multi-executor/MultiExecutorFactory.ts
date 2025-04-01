import { MultiExecutor } from "..";
import { getS, stringify, timeoutOrResult } from "../common";
import { loggerFactory } from "../logger";
import { AgreementExecutor } from "./AgreementExecutor";
import {
  AllEqualConsensusExecutor,
  MedianConsensusExecutor,
} from "./ConsensusExecutor";
import { AsyncFn, Executor } from "./Executor";
import { FallbackExecutor } from "./FallbackExecutor";
import { RaceExecutor } from "./RaceExecutor";
import {
  ExecutionMode,
  MultiExecutorConfig,
  NestedMethodConfig,
} from "./create";

export class MultiExecutorFactory<T extends object> {
  private logger = loggerFactory("multi-executor-proxy");

  constructor(
    private instances: T[],
    private methodConfig: NestedMethodConfig<T>,
    private config: MultiExecutorConfig
  ) {}

  private getMethodMode(methodName: keyof T) {
    const mode = this.methodConfig[methodName];
    if (mode instanceof Executor) {
      return mode;
    }
    if (typeof mode === "string") {
      return mode as ExecutionMode;
    }
    if (mode === undefined) {
      return this.config.defaultMode;
    }

    throw new Error(
      `Unexpected NestedMethodConfig for function ${methodName.toString()}`
    );
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
        return new MedianConsensusExecutor(
          this.config.consensusQuorumRatio,
          this.config.singleExecutionTimeoutMs
        );
      case ExecutionMode.CONSENSUS_ALL_EQUAL:
        return new AllEqualConsensusExecutor(
          this.config.consensusQuorumRatio,
          this.config.singleExecutionTimeoutMs
        );
      case ExecutionMode.AGREEMENT:
        return new AgreementExecutor(
          this.config.agreementQuorumNumber,
          this.config.singleExecutionTimeoutMs
        );
    }
  }

  createProxy(): T {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    Object.assign(this.instances[0], { __instances: this.instances });

    return new Proxy(this.instances[0], {
      get(target: T, prop: string | symbol): unknown {
        const key = prop as keyof T;
        const method = target[key];

        if (Object(method) !== method) {
          return method;
        }

        if (typeof method !== "function") {
          return MultiExecutor.create(
            that.instances.map((instance) => instance[key] as object),
            that.methodConfig[key] ?? {},
            that.config
          );
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

            return await that.performExecuting(key, promises);
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

  private async performExecuting(key: keyof T, promises: AsyncFn<unknown>[]) {
    const mode = this.getMethodMode(key);
    this.logger.debug(
      `[${stringify(key)}] Executing ${promises.length} promise${getS(promises.length)}` +
        ` with ${typeof mode === "string" ? mode : typeof mode}` +
        (this.config.allExecutionsTimeoutMs
          ? ` and totalExecutionTimeout: ${this.config.allExecutionsTimeoutMs} [ms]`
          : "")
    );

    const result = this.getExecutor(mode).execute(promises);
    const value = await timeoutOrResult(
      result,
      this.config.allExecutionsTimeoutMs
    );
    this.logger.debug(`[${stringify(key)}] Returning ${stringify(value)}`);
    return value;
  }
}
