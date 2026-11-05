import { Contract } from "@ethersproject/contracts";
import { RedstoneCommon } from "@redstone-finance/utils";
import { type HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { hardhatContractFactory } from "./hre-utils.js";

export async function deployContract<Deployed extends Contract = Contract>(
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  ...args: unknown[]
) {
  const contractFactory = await hardhatContractFactory(hre, contractName);
  const { contract, address } = await RedstoneCommon.awaitDeployment(
    await contractFactory.deploy(...args)
  );

  return { contract: contract as Deployed, address };
}
