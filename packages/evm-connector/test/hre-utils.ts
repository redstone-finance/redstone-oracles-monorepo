import { HardhatRuntimeEnvironment } from "hardhat/types";

export function hardhatProvider(hre: HardhatRuntimeEnvironment) {
  return Promise.resolve(hre.ethers.provider);
}

export async function hardhatSigners(hre: HardhatRuntimeEnvironment) {
  return await hre.ethers.getSigners();
}

export async function hardhatContractFactory(hre: HardhatRuntimeEnvironment, contractName: string) {
  return await hre.ethers.getContractFactory(contractName);
}
