import { expect } from "chai";
import { Signer } from "ethers";
import { ethers } from "hardhat";
import { RedstoneToken } from "../typechain-types";

describe("RedStone token", () => {
  let contract: RedstoneToken;
  let minter: Signer;
  let other: Signer;
  let yetAnother: Signer;
  let minterAddr: string;
  let otherAddr: string;
  let yetAnotherAddr: string;

  beforeEach(async () => {
    const ContractFactory = await ethers.getContractFactory("RedstoneToken");
    contract = await ContractFactory.deploy(1000);
    await contract.deployed();
    [minter, other, yetAnother] = await ethers.getSigners();
    minterAddr = await minter.getAddress();
    otherAddr = await other.getAddress();
    yetAnotherAddr = await yetAnother.getAddress();
  });

  it("Should not init contract with too high total supply", async () => {
    const ContractFactory = await ethers.getContractFactory("RedstoneToken");
    const tooBigSupply = ethers.utils.parseEther("1000000000").add(1);
    await expect(
      ContractFactory.deploy(tooBigSupply)
    ).to.be.revertedWithCustomError(
      ContractFactory,
      "CanNotMintMoreThanMaxSupply"
    );
  });

  it("Should properly transfer tokens", async () => {
    expect(await contract.balanceOf(minterAddr)).to.equal(1000);

    const transferTx = await contract.transfer(otherAddr, 700);
    await transferTx.wait();

    expect(transferTx)
      .to.emit(contract, "Transfer")
      .withArgs(otherAddr, minterAddr, 700);
    expect(await contract.balanceOf(minterAddr)).to.equal(300);
    expect(await contract.balanceOf(otherAddr)).to.equal(700);
  });

  it("Should not mint from account other than the minter", async () => {
    contract = contract.connect(other);

    await expect(contract.mint(otherAddr, 100)).to.be.revertedWithCustomError(
      contract,
      "OnlyMinterCanMint"
    );
  });

  it("Should mint from minter account", async () => {
    expect(await contract.balanceOf(otherAddr)).to.equal(0);

    const tx = await contract.mint(otherAddr, 100);
    await tx.wait();

    expect(await contract.balanceOf(otherAddr)).to.equal(100);
  });

  it("Should mint max supply", async () => {
    const max = ethers.utils.parseEther("50000000");

    const tx = await contract.mint(minterAddr, max.sub(1000));
    await tx.wait();

    expect(await contract.balanceOf(minterAddr)).to.equal(max);
  });

  it("Should not mint more than max supply", async () => {
    const max = ethers.utils.parseEther("1000000000");

    const tx = await contract.mint(minterAddr, max.sub(1000));
    await tx.wait();

    await expect(contract.mint(minterAddr, 1)).to.be.revertedWithCustomError(
      contract,
      "CanNotMintMoreThanMaxSupply"
    );
  });

  it("Should properly update minter ", async () => {
    // Propose
    const proposalTx = await contract.proposeNewMinter(otherAddr);
    await proposalTx.wait();
    expect(proposalTx).to.emit(contract, "MinterProposal").withArgs(otherAddr);
    expect(await contract.minter()).to.equal(minterAddr);
    expect(await contract.proposedMinter()).to.equal(otherAddr);

    // Accept
    const acceptRoleTx = await contract.connect(other).acceptMinterRole();
    await acceptRoleTx.wait();
    expect(acceptRoleTx).to.emit(contract, "MinterUpdate").withArgs(otherAddr);
    expect(await contract.minter()).to.equal(otherAddr);
    expect(await contract.proposedMinter()).to.equal(
      ethers.constants.AddressZero
    );

    // Mint only from a new minter
    await expect(contract.mint(otherAddr, 100)).to.be.revertedWithCustomError(
      contract,
      "OnlyMinterCanMint"
    );
    const tx = await contract.connect(other).mint(otherAddr, 42);
    await tx.wait();
    expect(await contract.balanceOf(otherAddr)).to.equal(42);
  });

  it("Should properly propose another address before acceptance", async () => {
    // First proposal
    const proposalTx = await contract.proposeNewMinter(otherAddr);
    await proposalTx.wait();
    expect(await contract.minter()).to.equal(minterAddr);
    expect(await contract.proposedMinter()).to.equal(otherAddr);

    // Second proposal
    const proposalTx2 = await contract.proposeNewMinter(yetAnotherAddr);
    await proposalTx2.wait();

    // Only second addr should be able to accept minter role
    await expect(
      contract.connect(other).acceptMinterRole()
    ).to.be.revertedWithCustomError(
      contract,
      "OnlyProposedMinterCanAcceptMinterRole"
    );
    const acceptRoleTx = await contract.connect(yetAnother).acceptMinterRole();
    await acceptRoleTx.wait();
    expect(await contract.minter()).to.equal(yetAnotherAddr);
  });

  it("Should not propose new minter from an unauthorized account", async () => {
    await expect(
      contract.connect(other).proposeNewMinter(otherAddr)
    ).to.be.revertedWithCustomError(contract, "OnlyMinterCanProposeNewMinter");
  });

  it("Should not accept minter role from an unauthorized account", async () => {
    const proposalTx = await contract.proposeNewMinter(otherAddr);
    await proposalTx.wait();
    await expect(contract.acceptMinterRole()).to.be.revertedWithCustomError(
      contract,
      "OnlyProposedMinterCanAcceptMinterRole"
    );
  });
});
