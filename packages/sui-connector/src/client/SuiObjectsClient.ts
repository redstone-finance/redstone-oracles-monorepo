import { CoreClient, type SuiClientTypes } from "@mysten/sui/client";
import { Collector } from "@redstone-finance/utils";
import { GetObjectsCollector } from "./GetObjectsCollector";

export const OBJECT_INCLUDE = { json: true, content: true } as const;

const GET_OBJECTS = "getObjects" satisfies keyof CoreClient;

type GetObjectsOptions = Parameters<CoreClient["getObjects"]>[0];

export class SuiObjectsClient {
  private readonly collectors = new Collector.CollectorRegistry(
    getIncludeKey,
    (include?: SuiClientTypes.ObjectInclude) => new GetObjectsCollector(this.rawCore, include)
  );
  readonly core: CoreClient;

  constructor(private readonly rawCore: CoreClient) {
    this.core = this.makeBatchingCore();
  }

  async getObjects(objectIds: string[], include: SuiClientTypes.ObjectInclude = OBJECT_INCLUDE) {
    const { objects } = await this.core.getObjects({ objectIds, include });

    return objects.map((obj) => {
      if (obj instanceof Error) {
        throw obj;
      }

      return obj;
    });
  }

  async getObject(objectId: string, include: SuiClientTypes.ObjectInclude = OBJECT_INCLUDE) {
    const { object } = await this.core.getObject({ objectId, include });

    return object;
  }

  getDynamicFieldValue(parentId: string, name: SuiClientTypes.DynamicFieldName) {
    return this.core.getDynamicField({ parentId, name });
  }

  wrapClient<T extends object>(client: T): T {
    return new Proxy(client, {
      get: (target, prop, receiver) => {
        if (prop === "core") {
          return this.core;
        }

        const value = Reflect.get(target, prop, receiver) as unknown;
        if (typeof value === "function") {
          return (value as (...args: unknown[]) => unknown).bind(target);
        }

        return value;
      },
    });
  }

  dispose() {
    this.collectors.disposeAll();
  }

  private makeBatchingCore() {
    return new Proxy(this.rawCore, {
      get: (target, prop, receiver) => {
        if (prop === GET_OBJECTS) {
          return this.batchedGetObjects.bind(this);
        }

        const value = Reflect.get(target, prop, receiver) as unknown;
        if (typeof value !== "function") {
          return value;
        }

        if (isDeclaredOnAbstractCore(prop)) {
          return value;
        }

        return (value as (...args: unknown[]) => unknown).bind(target);
      },
    });
  }

  private async batchedGetObjects(options: GetObjectsOptions) {
    const objects = await this.collectors.get(options.include).collectMany(options.objectIds);

    return { objects };
  }
}

export function getIncludeKey(include?: SuiClientTypes.ObjectInclude) {
  return include === undefined ? "" : JSON.stringify(include);
}

const abstractCorePropCache = new Map<string | symbol, boolean>();

function isDeclaredOnAbstractCore(prop: string | symbol) {
  const cached = abstractCorePropCache.get(prop);
  if (cached !== undefined) {
    return cached;
  }

  let p: object | null = CoreClient.prototype;
  while (p && p !== Object.prototype) {
    if (Object.prototype.hasOwnProperty.call(p, prop)) {
      abstractCorePropCache.set(prop, true);

      return true;
    }
    p = Object.getPrototypeOf(p) as object | null;
  }

  abstractCorePropCache.set(prop, false);

  return false;
}
