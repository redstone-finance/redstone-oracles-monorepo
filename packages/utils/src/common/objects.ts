/**
 * if objects share keys the last value of the key is used in result
 */
export function mergeObjects<T = unknown>(objects: T[]) {
  return Object.assign({}, ...objects) as T;
}

export function getRequiredPropValue<T = unknown>(
  obj: { [x: string]: unknown },
  prop: string
): T {
  if (obj[prop] === undefined) {
    throw new Error(
      `Object does not contain required property "${prop}". Obj: ` +
        JSON.stringify(obj)
    );
  }

  return obj[prop] as T;
}

export function isEmpty<T>(value: T): value is NonNullable<T> {
  return isDefined(value) && value !== "";
}

export function useDefaultIfEmpty<T>(
  value: T | null | undefined,
  defaultValue: T
): T {
  return isEmpty(value) ? value : defaultValue;
}

export async function fetchDefaultIfEmpty<T>(
  value: T | null | undefined,
  defaultValueFetcher: () => Promise<T>
): Promise<T> {
  return isEmpty(value) ? value : await defaultValueFetcher();
}

export function isDefined<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

export function isTruthy<T>(value: T): value is NonNullable<T> {
  return !!value;
}

export const ensureInitialized = <T>(
  o: Partial<Record<string, T>>,
  key: string,
  initializer: () => T
): o is Record<string, T> => {
  if (!(key in o)) {
    o[key] = initializer();
  }
  return true;
};

export const createEmptySet = <T>(): Set<T> => new Set();
