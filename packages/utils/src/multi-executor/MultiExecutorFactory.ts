import _ from "lodash";
import { getNS, stringify, throwUnsupportedParamError, timeoutOrResult } from "../common";
import { loggerFactory } from "../logger";
import { AgreementExecutor } from "./AgreementExecutor";
import { AllEqualConsensusExecutor, MedianConsensusExecutor } from "./ConsensusExecutor";
import { Executor } from "./Executor";
import { FallbackExecutor } from "./FallbackExecutor";
import { FnBox } from "./FnBox";
import { MultiAgreementExecutor } from "./MultiAgreementExecutor";
import { RaceExecutor } from "./RaceExecutor";
import { DEFAULT_CONFIG, ExecutionMode, MultiExecutorConfig, NestedMethodConfig } from "./config";

interface ProxyMeta<T extends object> {
  instances: T[];
  config: MultiExecutorConfig;
}

const PROXY_META = new WeakMap<object, ProxyMeta<object>>();

export class MultiExecutorFactory<T extends object> {
  private readonly logger = loggerFactory("multi-executor-proxy");

  constructor(
    private readonly instances: T[],
    private readonly methodConfig: NestedMethodConfig<T>,
    private readonly config: MultiExecutorConfig
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

    throw new Error(`Unexpected NestedMethodConfig for function ${methodName.toString()}`);
  }

  private getExecutor<R>(mode: ExecutionMode | Executor<R>): Executor<R> {
    if (mode instanceof Executor) {
      return mode;
    }

    switch (mode) {
      case ExecutionMode.RACE:
        return new RaceExecutor<R>();
      case ExecutionMode.FALLBACK:
        return new FallbackExecutor(this.config.singleExecutionTimeoutMs);
      case ExecutionMode.CONSENSUS_MEDIAN:
        return new MedianConsensusExecutor<R>(
          this.config.consensusQuorumRatio,
          this.config.singleExecutionTimeoutMs
        );
      case ExecutionMode.CONSENSUS_ALL_EQUAL:
        return new AllEqualConsensusExecutor<R>(
          this.config.consensusQuorumRatio,
          this.config.singleExecutionTimeoutMs
        );
      case ExecutionMode.AGREEMENT:
        return new AgreementExecutor<R>(
          this.config.agreementQuorumNumber,
          this.config.singleExecutionTimeoutMs
        );
      case ExecutionMode.MULTI_AGREEMENT:
        // in this case we now R is an array
        return new MultiAgreementExecutor<unknown[]>(
          this.config.agreementQuorumNumber,
          this.config.singleExecutionTimeoutMs,
          this.config.multiAgreementShouldResolveUnagreedToUndefined
        ) as unknown as Executor<R>;
      default:
        return throwUnsupportedParamError(mode);
    }
  }

  createProxy(): T {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- add reason here, please
    const that = this;

    const proxy = new Proxy(this.instances[0], {
      get(target: T, prop: string | symbol): unknown {
        const key = prop as keyof T;
        const method = target[key];

        if (Object(method) !== method) {
          return method;
        }

        if (typeof method !== "function") {
          return create(
            that.instances.map((instance) => instance[key] as object),
            that.methodConfig[key] ?? {},
            that.config
          );
        }

        if (method.constructor.name === "AsyncFunction" || method.toString().includes("Promise")) {
          return async function (...args: unknown[]): Promise<unknown> {
            const functions = that.instances.map((instance, index) =>
              MultiExecutorFactory.makeFnBox(method.name, that.config, index, instance, key, args)
            );

            return await that.performExecuting(key, functions);
          };
        }

        return function (...args: unknown[]): unknown {
          return (target[key] as (...args: unknown[]) => unknown).call(target, ...args);
        };
      },
    });

    PROXY_META.set(proxy, { instances: this.instances, config: this.config });

    return proxy;
  }

  private static makeFnBox<T>(
    name: string,
    config: MultiExecutorConfig,
    index: number,
    instance: T,
    key: keyof T,
    args: unknown[]
  ): FnBox<unknown> {
    return {
      name,
      description: config.descriptions?.[index],
      index,
      delegate: config.delegate,
      fn: () =>
        Promise.resolve((instance[key] as (...args: unknown[]) => unknown).call(instance, ...args)),
    };
  }

  private async performExecuting<R>(key: keyof T, functions: FnBox<R>[]) {
    const mode = this.getMethodMode(key);
    this.logger.debug(
      `[${stringify(key)}] Executing ${getNS(functions.length, "promise")}` +
        ` with ${typeof mode === "string" ? mode : typeof mode}` +
        (this.config.allExecutionsTimeoutMs
          ? ` and totalExecutionTimeout: ${this.config.allExecutionsTimeoutMs} [ms]`
          : "")
    );

    const result = this.getExecutor<R>(mode).execute(functions);
    const value = await timeoutOrResult(result, this.config.allExecutionsTimeoutMs);
    this.logger.trace(`[${stringify(key)}] Returning ${stringify(value)}`);

    return value;
  }
}

export function create<T extends object>(
  instances: T[],
  methodConfig: NestedMethodConfig<T> = {},
  config: MultiExecutorConfig = DEFAULT_CONFIG
): T {
  if (!instances.length) {
    throw new Error("At least one instance is required");
  }

  return new MultiExecutorFactory(instances, methodConfig, config).createProxy();
}

export function createForSubInstances<T extends object, U extends object>(
  subject: T,
  callback: (arg: T) => U,
  methodConfig: NestedMethodConfig<U> = {},
  config: MultiExecutorConfig = DEFAULT_CONFIG
) {
  const meta = PROXY_META.get(subject) as ProxyMeta<T> | undefined;
  const instances = meta ? meta.instances.map(callback) : [callback(subject)];
  const mergedConfig = meta ? _.assign({}, meta.config, config) : config;

  return create(instances, methodConfig, mergedConfig);
}
