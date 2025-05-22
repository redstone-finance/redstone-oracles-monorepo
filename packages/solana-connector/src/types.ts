import { type BN } from "@coral-xyz/anchor";

export interface PriceData {
  feedId: number[];
  value: number[];
  timestamp: BN;
  writeTimestamp: BN | null;
}
