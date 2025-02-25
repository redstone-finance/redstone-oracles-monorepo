import { expect } from "chai";
import { ethers } from "hardhat";
import { RedstoneTokenFactory, RedstoneToken } from "../typechain-types";

describe("RedstoneTokenFactory", () => {
  let factory: RedstoneTokenFactory;
  let token: RedstoneToken;
  let deployer: any;
  let other: any;
  let deployerAddr: string;
  let otherAddr: string;

  beforeEach(async () => {
    [deployer, other] = await ethers.getSigners();
    deployerAddr = await deployer.getAddress();
    otherAddr = await other.getAddress();

    const FactoryContract = await ethers.getContractFactory("RedstoneTokenFactory");
    factory = await FactoryContract.deploy();
    await factory.deployed();
  });

  it("Should deploy a token and propose minter", async () => {
    const tx = await factory.deployTokenAndProposeNewMinter();
    await tx.wait();

    const tokenAddress = await factory.token();
    expect(tokenAddress).to.not.equal(ethers.constants.AddressZero);

    const TokenContract = await ethers.getContractFactory("RedstoneToken");
    token = TokenContract.attach(tokenAddress);
    expect(await token.proposedMinter()).to.equal(deployerAddr);
  });

  it("Should not deploy a second token", async () => {
    await factory.deployTokenAndProposeNewMinter();
    await expect(factory.deployTokenAndProposeNewMinter()).to.be.revertedWith("Already deployed");
  });

  it("Should allow proposed minter to accept the role", async () => {
    await factory.deployTokenAndProposeNewMinter();
    const tokenAddress = await factory.token();
    const TokenContract = await ethers.getContractFactory("RedstoneToken");
    token = TokenContract.attach(tokenAddress);

    const acceptTx = await token.connect(deployer).acceptMinterRole();
    await acceptTx.wait();

    expect(await token.minter()).to.equal(deployerAddr);
  });
});
