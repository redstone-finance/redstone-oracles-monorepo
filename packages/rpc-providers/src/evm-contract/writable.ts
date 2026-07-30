import type { Provider } from "@ethersproject/abstract-provider";
import type { ContractInterface } from "@ethersproject/contracts";
import { RedstoneCommon } from "@redstone-finance/utils";
import type { Provider as ProviderV6 } from "ethers-v6";
import { z } from "zod";
import { buildContract, type WritableApi } from "./builder";

export function evmWritableContract<Api extends WritableApi>(
  address: string,
  abi: ContractInterface,
  provider: Provider,
  isV6Contract?: boolean
): Api;
export function evmWritableContract<Api extends WritableApi>(
  address: string,
  abi: ContractInterface,
  provider: ProviderV6
): Api;
export function evmWritableContract<Api extends WritableApi>(
  address: string,
  abi: ContractInterface,
  provider: Provider | ProviderV6,
  isV6Contract = RedstoneCommon.getFromEnv("USE_CONTRACT_V6", z.boolean().default(false))
) {
  return buildContract<Api>(address, abi, provider, isV6Contract);
}

export function evmWritableContractV5<Api extends WritableApi>(
  address: string,
  abi: ContractInterface,
  provider: Provider
) {
  return buildContract<Api>(address, abi, provider, false);
}

export function evmWritableContractV6<Api extends WritableApi>(
  address: string,
  abi: ContractInterface,
  provider: Provider
) {
  return buildContract<Api>(address, abi, provider, true);
}
