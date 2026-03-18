export function areSetsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  return a.size === b.size && a.intersection(b).size === a.size;
}
