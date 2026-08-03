import type { BlockTag, Provider } from "@ethersproject/abstract-provider";
import type { Signer } from "@ethersproject/abstract-signer";
import { Contract, type ContractInterface } from "@ethersproject/contracts";
import {
  Contract as ContractV6,
  type ContractRunner,
  type InterfaceAbi,
  type Provider as ProviderV6,
} from "ethers-v6";
import { toV5BigNumber, toV6Arg } from "./conversions";

export type CallStaticApi = { callStatic: object };
export type WritableApi = CallStaticApi & { populateTransaction: object };

export function buildContract<Api>(
  address: string,
  abi: ContractInterface,
  provider: Provider | ProviderV6,
  isV6Contract: boolean
) {
  if (isV6Provider(provider)) {
    return v6Contract(address, abi, provider) as Api;
  }

  if (isV6Contract) {
    return v6Contract(address, abi, v5ProviderRunner(address, provider)) as Api;
  }

  const contract = new Contract(address, abi, provider);

  return {
    callStatic: contract.callStatic,
    populateTransaction: contract.populateTransaction,
  } as Api;
}

export function buildWritableContract<Api>(
  address: string,
  abi: ContractInterface,
  signer: Signer,
  isV6Contract: boolean
) {
  if (!isV6Contract) {
    const contract = new Contract(address, abi, signer);

    return {
      callStatic: contract.callStatic,
      populateTransaction: contract.populateTransaction,
    } as Api;
  }

  const contract = new ContractV6(address, abi as InterfaceAbi, v5ProviderRunner(address, signer));

  return {
    callStatic: v6CallStatic(contract),
    populateTransaction: v6WritablePopulateTransaction(contract, signer),
  } as Api;
}

function v5ProviderRunner(address: string, providerOrSigner: Provider | Signer) {
  const runner: ContractRunner = {
    provider: null,
    call: (tx) =>
      providerOrSigner.call(
        { to: address, data: tx.data ?? undefined },
        (tx.blockTag ?? undefined) as BlockTag | undefined
      ),
  };

  return runner;
}

function v6Contract(address: string, abi: ContractInterface, runner: ContractRunner) {
  const contract = new ContractV6(address, abi as InterfaceAbi, runner);

  return {
    callStatic: v6CallStatic(contract),
    populateTransaction: v6PopulateTransaction(contract),
  };
}

function v6CallStatic(contract: ContractV6) {
  return new Proxy(
    {},
    {
      get:
        (_target, method: string) =>
        async (...args: unknown[]) =>
          toV5BigNumber(await contract.getFunction(method).staticCall(...args.map(toV6Arg))),
    }
  );
}

function v6PopulateTransaction(contract: ContractV6) {
  return new Proxy(
    {},
    {
      get:
        (_target, method: string) =>
        async (...args: unknown[]) =>
          toV5BigNumber(
            await contract.getFunction(method).populateTransaction(...args.map(toV6Arg))
          ),
    }
  );
}

function v6WritablePopulateTransaction(contract: ContractV6, signer: Signer) {
  return new Proxy(
    {},
    {
      get:
        (_target, method: string) =>
        async (...args: unknown[]) =>
          toV5BigNumber({
            ...(await contract.getFunction(method).populateTransaction(...args.map(toV6Arg))),
            from: await signer.getAddress(),
          }),
    }
  );
}

function isV6Provider(provider: Provider | ProviderV6): provider is ProviderV6 {
  return "broadcastTransaction" in provider;
}
