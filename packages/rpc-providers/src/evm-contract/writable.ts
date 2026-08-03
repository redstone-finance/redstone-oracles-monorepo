import type { Signer } from "@ethersproject/abstract-signer";
import type { ContractInterface } from "@ethersproject/contracts";
import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { buildWritableContract, type WritableApi } from "./builder";

export function evmWritableContract<Api extends WritableApi>(
  address: string,
  abi: ContractInterface,
  signer: Signer,
  isV6Contract = RedstoneCommon.getFromEnv("USE_CONTRACT_V6", z.boolean().default(false))
) {
  return buildWritableContract<Api>(address, abi, signer, isV6Contract);
}

export function evmWritableContractV5<Api extends WritableApi>(
  address: string,
  abi: ContractInterface,
  signer: Signer
) {
  return buildWritableContract<Api>(address, abi, signer, false);
}

export function evmWritableContractV6<Api extends WritableApi>(
  address: string,
  abi: ContractInterface,
  signer: Signer
) {
  return buildWritableContract<Api>(address, abi, signer, true);
}
