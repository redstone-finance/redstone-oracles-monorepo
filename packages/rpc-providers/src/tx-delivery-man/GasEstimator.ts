import * as providers from "@ethersproject/providers";
import { RedstoneCommon } from "@redstone-finance/utils";
import type { FeeStructure } from "./common";

export interface GasEstimator<T extends FeeStructure> {
  getFees(provider: providers.Provider, attempt?: number): Promise<T>;
  scaleFees(currentFees: T, attempt: number): T;
}

export function isJsonRpcProvider(
  provider: providers.Provider
): provider is providers.JsonRpcProvider {
  return typeof (provider as Partial<providers.JsonRpcProvider>).send === "function";
}

export function assertJsonRpcProvider(
  provider: providers.Provider
): asserts provider is providers.JsonRpcProvider {
  RedstoneCommon.assert(isJsonRpcProvider(provider), "Provider does not support JSON-RPC calls");
}
