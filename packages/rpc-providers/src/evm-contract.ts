import type { BlockTag, Provider } from "@ethersproject/abstract-provider";
import { Contract, type ContractInterface } from "@ethersproject/contracts";
import { RedstoneCommon } from "@redstone-finance/utils";
import {
  Contract as ContractV6,
  type ContractRunner,
  type InterfaceAbi,
  type Provider as ProviderV6,
} from "ethers-v6";
import { z } from "zod";
import { toV5BigNumber, toV6Arg } from "./evm-contract-conversions";

export function evmContract<Api extends { callStatic: object }>(
  address: string,
  abi: ContractInterface,
  provider: Provider,
  isV6?: boolean
): Api;
export function evmContract<Api extends { callStatic: object }>(
  address: string,
  abi: ContractInterface,
  provider: ProviderV6
): Api;
export function evmContract<Api extends { callStatic: object }>(
  address: string,
  abi: ContractInterface,
  provider: Provider | ProviderV6,
  isV6 = RedstoneCommon.getFromEnv("USE_CONTRACT_V6", z.boolean().default(false))
) {
  if (isV6Provider(provider)) {
    return v6ContractOverRunner<Api>(address, abi, provider);
  }

  return isV6
    ? evmContractV6<Api>(address, abi, provider)
    : evmContractV5<Api>(address, abi, provider);
}

export function evmContractV5<Api extends { callStatic: object }>(
  address: string,
  abi: ContractInterface,
  provider: Provider
) {
  const contract = new Contract(address, abi, provider);

  return { callStatic: contract.callStatic } as Api;
}

export function evmContractV6<Api extends { callStatic: object }>(
  address: string,
  abi: ContractInterface,
  provider: Provider
) {
  const runner: ContractRunner = {
    provider: null,
    call: (tx) =>
      provider.call(
        { to: address, data: tx.data ?? undefined },
        (tx.blockTag ?? undefined) as BlockTag | undefined
      ),
  };

  return v6ContractOverRunner<Api>(address, abi, runner);
}

function v6ContractOverRunner<Api extends { callStatic: object }>(
  address: string,
  abi: ContractInterface,
  runner: ContractRunner
) {
  const contract = new ContractV6(address, abi as InterfaceAbi, runner);
  const callStatic = new Proxy(
    {},
    {
      get:
        (_target, method: string) =>
        async (...args: unknown[]) =>
          toV5BigNumber(await contract.getFunction(method).staticCall(...args.map(toV6Arg))),
    }
  );

  return { callStatic } as Api;
}

function isV6Provider(provider: Provider | ProviderV6): provider is ProviderV6 {
  return "broadcastTransaction" in provider;
}
