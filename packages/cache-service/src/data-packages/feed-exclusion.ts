// `*` is a special char that a normal feed id never contains, so it is safe
// to use it as a wildcard marker in the exclusion patterns:
//   - `*XYZ` matches any feed id that endsWith "XYZ"
//   - `XYZ*` matches any feed id that startsWith "XYZ"
//   - `XYZ`  matches the feed id exactly
const matchesPattern = (feedId: string, pattern: string): boolean => {
  if (pattern.startsWith("*")) {
    return feedId.endsWith(pattern.slice(1));
  }
  if (pattern.endsWith("*")) {
    return feedId.startsWith(pattern.slice(0, -1));
  }

  return feedId === pattern;
};

export const isFeedExcluded = (feedId: string, excludedPatterns: string[]): boolean =>
  excludedPatterns.some((pattern) => matchesPattern(feedId, pattern));
