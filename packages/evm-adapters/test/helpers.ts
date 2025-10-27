import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, network } from "hardhat";

export const DEFAULT_ROUND_ID_FOR_WITHOUT_ROUNDS = 1;

export async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
  const initialFunds = ethers.utils.parseEther("1");
  await network.provider.send("hardhat_setBalance", [address, ethers.utils.hexValue(initialFunds)]);
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  return await ethers.getSigner(address);
}

export function permutations<T>(list: T[]): T[][] {
  if (list.length <= 1) {
    return [list];
  }

  const result: T[][] = [];
  for (let i = 0; i < list.length; i++) {
    const tails = permutations(list.filter((_element, index) => i !== index));
    for (const tail of tails) {
      result.push([list[i], ...tail]);
    }
  }
  return result;
}
