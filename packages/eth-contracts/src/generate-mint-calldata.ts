import { task } from "hardhat/config";

// npx hardhat generate-mint-calldata --recipient 0xDb9C048cd618Ee4fC42D6EeF70A31A18abCC576b --amount "42"

type TaskArgs = {
  recipient: string;
  amount: string;
};

// Define a Hardhat task for generating calldata for minting tokens
task("generate-mint-calldata", "Generates calldata for minting tokens")
  .addParam("recipient", "The address to receive the tokens")
  .addParam("amount", "The amount of tokens to mint (in whole units, not wei)")
  .setAction(async (taskArgs: TaskArgs, hre) => {
    const { recipient, amount } = taskArgs;
    const parsedAmount = hre.ethers.utils.parseEther(amount);

    const tokenFactory = await hre.ethers.getContractFactory("RedstoneToken");
    const tokenABI = tokenFactory.interface;

    const mintCalldata = tokenABI.encodeFunctionData("mint", [recipient, parsedAmount]);
    console.log("Generated calldata for minting tokens:", mintCalldata);
  });
