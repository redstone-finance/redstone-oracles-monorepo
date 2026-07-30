import type { Provider } from "@ethersproject/abstract-provider";
import type { ContractInterface } from "@ethersproject/contracts";
import { RedstoneCommon } from "@redstone-finance/utils";
import type { Provider as ProviderV6 } from "ethers-v6";
import { z } from "zod";
import { buildContract, type CallStaticApi } from "./builder";

export function evmContract<Api extends CallStaticApi>(
  address: string,
  abi: ContractInterface,
  provider: Provider,
  isV6Contract?: boolean
): Api;
export function evmContract<Api extends CallStaticApi>(
  address: string,
  abi: ContractInterface,
  provider: ProviderV6
): Api;
export function evmContract<Api extends CallStaticApi>(
  address: string,
  abi: ContractInterface,
  provider: Provider | ProviderV6,
  isV6Contract = RedstoneCommon.getFromEnv("USE_CONTRACT_V6", z.boolean().default(false))
) {
  return buildContract<Api>(address, abi, provider, isV6Contract);
}

export function evmContractV5<Api extends CallStaticApi>(
  address: string,
  abi: ContractInterface,
  provider: Provider
) {
  return buildContract<Api>(address, abi, provider, false);
}

export function evmContractV6<Api extends CallStaticApi>(
  address: string,
  abi: ContractInterface,
  provider: Provider
) {
  return buildContract<Api>(address, abi, provider, true);
}
