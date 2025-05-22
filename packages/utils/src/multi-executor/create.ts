import _ from "lodash";
import { MultiExecutorFactory } from "./MultiExecutorFactory";
import {
  DEFAULT_CONFIG,
  MultiExecutorConfig,
  NestedMethodConfig,
} from "./config";

export function create<T extends object>(
  instances: T[],
  methodConfig: NestedMethodConfig<T> = {},
  config: MultiExecutorConfig = DEFAULT_CONFIG
): T {
  if (!instances.length) {
    throw new Error("At least one instance is required");
  }

  return new MultiExecutorFactory(
    instances,
    methodConfig,
    config
  ).createProxy();
}

export function createForSubInstances<T extends object, U extends object>(
  subject: T,
  callback: (arg: T) => U,
  methodConfig: NestedMethodConfig<U> = {},
  config: MultiExecutorConfig = DEFAULT_CONFIG
) {
  const instances =
    "__instances" in subject
      ? (subject.__instances as T[]).map(callback)
      : [callback(subject)];

  const baseConfig = "__config" in subject ? subject.__config : undefined;
  const mergedConfig = baseConfig ? _.assign({}, baseConfig, config) : config;

  return create(instances, methodConfig, mergedConfig);
}
