export type ConsumedRange = { from: number; to: number };

export function overlapLength(first: ConsumedRange, second: ConsumedRange) {
  return Math.max(0, Math.min(first.to, second.to) - Math.max(first.from, second.from));
}
