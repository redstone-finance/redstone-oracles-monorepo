import { ethers } from "hardhat";

async function main() {
  const factory = await ethers.getContractFactory("RedstoneTokenFactory");
  const contractABI = factory.interface;

  const deployCalldata = contractABI.encodeFunctionData("deployTokenAndProposeNewMinter", []);
  console.log("Generated calldata for deployTokenAndProposeNewMinter:", deployCalldata);

  const tokenFactory = await ethers.getContractFactory("RedstoneToken");
  const tokenABI = tokenFactory.interface;

  const acceptMinterCalldata = tokenABI.encodeFunctionData("acceptMinterRole", []);
  console.log("Generated calldata for acceptMinterRole:", acceptMinterCalldata);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
