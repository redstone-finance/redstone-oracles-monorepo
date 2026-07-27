import * as providers from "@ethersproject/providers";
import type { FeeStructure } from "./common";

export interface GasEstimator<T extends FeeStructure> {
  getFees(provider: providers.JsonRpcProvider, attempt?: number): Promise<T>;
  scaleFees(currentFees: T, attempt: number): T;
}
