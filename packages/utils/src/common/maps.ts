import { isDefined } from "./objects";

export function getOrSet<K, V>(
  map: { get(key: K): V | undefined; set(key: K, value: V): unknown },
  key: K,
  build: () => V
) {
  const stored = map.get(key);
  if (isDefined(stored)) {
    return stored;
  }

  const built = build();
  map.set(key, built);

  return built;
}
