export function isSubsetOf<T>(superset: Set<T>, subset: Set<T>) {
  for (const elem of subset) {
    if (!superset.has(elem)) {
      return false;
    }
  }
  return true;
}
