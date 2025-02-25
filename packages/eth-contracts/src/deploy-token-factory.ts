import { ethers, run } from "hardhat";

// Example usage: npx hardhat run src/deploy-token-factory.ts --network sepolia

async function main() {
  const contractName = "RedstoneTokenFactory";
  console.log(`Deploying ${contractName} contract...`);

  const factory = await ethers.getContractFactory(contractName);
  const factoryContract = await factory.deploy();
  await factoryContract.deployed();

  console.log(`${contractName} deployed at: ${factoryContract.address}`);

  // Wait for a few block confirmations before verifying
  console.log("Waiting for block confirmations...");
  await factoryContract.deployTransaction.wait(5);

  // Run Hardhat verify (verify source code)
  console.log("Verifying contract...");
  try {
    await run("verify:verify", {
      address: factoryContract.address,
      constructorArguments: [],
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    console.error("Verification failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
