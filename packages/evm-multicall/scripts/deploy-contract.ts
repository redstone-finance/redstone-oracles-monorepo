import { getSSMParameterValue } from "@redstone-finance/internal-utils";
import assert from "assert";
import { ethers } from "ethers";
import hre from "hardhat";

const SSM_MULTICALL_PRIVATE_KEY_NAME =
  "arn:aws:ssm:eu-west-1:272838863926:parameter/prod/multicall-deployer/private-key/good-one";

async function deployRedstoneMulticall() {
  const privKey = await getSSMParameterValue(SSM_MULTICALL_PRIVATE_KEY_NAME);
  assert.ok(privKey, "Failed to fetch SSM_MULTICALL_PRIVATE_KEY_NAME");

  const wallet = new ethers.Wallet(privKey).connect(hre.ethers.provider);

  console.log("deploy start");
  const contractFactory = await hre.ethers.getContractFactory("RedstoneMulticall3", wallet);
  const deployed = await contractFactory.deploy();
  await deployed.deployed();

  console.log(`deploy_tx= ${JSON.stringify(deployed.deployTransaction)}`);
  console.log(`address= ${deployed.address}`);
}

void deployRedstoneMulticall();
