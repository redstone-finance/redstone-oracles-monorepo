import { providers } from "ethers";
import type { FeeStructure } from "./common";

export interface GasEstimator<T extends FeeStructure> {
  getFees(provider: providers.JsonRpcProvider, attempt?: number): Promise<T>;
  scaleFees(currentFees: T, attempt: number): T;
}
