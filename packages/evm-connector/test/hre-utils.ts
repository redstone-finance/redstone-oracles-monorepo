import { ContractFactory } from "@ethersproject/contracts";
import { Web3Provider } from "@ethersproject/providers";
import { type HardhatRuntimeEnvironment } from "hardhat/types/hre";

export async function hardhatProvider(hre: HardhatRuntimeEnvironment) {
  const { provider } = await hre.network.getOrCreate();

  return new Web3Provider({ request: (request) => provider.request(request) });
}

export async function hardhatSigners(hre: HardhatRuntimeEnvironment) {
  const provider = await hardhatProvider(hre);

  return (await provider.listAccounts()).map((address) => provider.getSigner(address));
}

export async function hardhatContractFactory(hre: HardhatRuntimeEnvironment, contractName: string) {
  const [{ abi, bytecode }, provider] = await Promise.all([
    hre.artifacts.readArtifact(contractName),
    hardhatProvider(hre),
  ]);

  return new ContractFactory(abi, bytecode, provider.getSigner());
}
