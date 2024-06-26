import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { RedstoneToken } from "../typechain-types";
import { time } from "../src/utils";
import { Contract, Transaction } from "ethers";

describe("Vesting Wallet", () => {
  let token: RedstoneToken,
    wallet: Contract,
    locking: Contract,
    signers: SignerWithAddress[],
    authorisedSlasher: SignerWithAddress,
    beneficiary: SignerWithAddress,
    notBeneficiary: SignerWithAddress,
    now: number = Math.floor(new Date().getTime() / 1000) + 100000000;

  const deployContracts = async (
    delayForUnlockingInSeconds: number = 10,
    allocation: number = 100,
    start: number = 0,
    cliffDuration: number = 100,
    vestingDuration: number = 100
  ) => {
    signers = await ethers.getSigners();
    notBeneficiary = signers[0];
    beneficiary = signers[1];
    authorisedSlasher = signers[2];

    // Deploy token contract
    const TokenContractFactory =
      await ethers.getContractFactory("RedstoneToken");
    token = await TokenContractFactory.deploy(1000);
    await token.deployed();

    // Deploy locking contract
    const LockingRegistryFactory =
      await ethers.getContractFactory("LockingRegistry");
    locking = await upgrades.deployProxy(LockingRegistryFactory, [
      token.address,
      await authorisedSlasher.getAddress(),
      delayForUnlockingInSeconds,
    ]);

    // Deploy wallet
    const VestingWalletFactory =
      await ethers.getContractFactory("VestingWallet");
    wallet = await upgrades.deployProxy(VestingWalletFactory, [
      token.address,
      beneficiary.address,
      locking.address,
      allocation,
      start,
      cliffDuration,
      vestingDuration,
    ]);
    wallet = wallet.connect(beneficiary);

    await token.transfer(wallet.address, allocation);
  };

  beforeEach(async () => {
    now += 1000;
    await time.setTimeAndMine(now);
    await deployContracts(100, 100, now + 10, 100, 100);
  });

  describe("No external funding", () => {
    it("Only beneficiary can try to release", async () => {
      await expect(
        wallet.connect(notBeneficiary).release(1)
      ).to.be.revertedWith(
        "VestingWallet: only beneficiary can call this function"
      );
    });

    it("Should not release before start", async () => {
      expect(await wallet.getReleasable()).to.eq(0);

      await expect(wallet.release(1)).to.be.revertedWith(
        "VestingWallet: there is not enough tokens to release"
      );
    });

    it("Should not release before end of the cliff", async () => {
      expect(await wallet.getReleasable()).to.eq(0);

      await expect(wallet.release(1)).to.be.revertedWith(
        "VestingWallet: there is not enough tokens to release"
      );
    });

    it("Should release in the 1/4 of vesting", async () => {
      expect(await token.balanceOf(beneficiary.address)).to.eq(0);

      await time.setTime(now + 10 + 100 + 25);
      await wallet.release(25);
      expect(await token.balanceOf(beneficiary.address)).to.eq(25);

      expect(await wallet.getReleasable()).to.eq(0);
    });

    it("Should release in the 1/2 of vesting", async () => {
      expect(await token.balanceOf(beneficiary.address)).to.eq(0);

      await time.setTime(now + 10 + 100 + 50);
      await wallet.release(50);
      expect(await token.balanceOf(beneficiary.address)).to.eq(50);

      expect(await wallet.getReleasable()).to.eq(0);
    });

    it("Should release in the 3/4 of vesting", async () => {
      expect(await token.balanceOf(beneficiary.address)).to.eq(0);

      await time.setTime(now + 10 + 100 + 75);

      await wallet.release(75);
      expect(await token.balanceOf(beneficiary.address)).to.eq(75);

      expect(await wallet.getReleasable()).to.eq(0);
    });

    it("Should release in the all of vesting at the end of vesting period", async () => {
      expect(await token.balanceOf(beneficiary.address)).to.eq(0);

      await time.setTime(now + 10 + 100 + 100);

      await wallet.release(100);
      expect(await token.balanceOf(beneficiary.address)).to.eq(100);

      expect(await wallet.getReleasable()).to.eq(0);
    });

    it("Should release in the all of vesting after the vesting period", async () => {
      expect(await token.balanceOf(beneficiary.address)).to.eq(0);

      await time.setTime(now + 10 + 100 + 200);

      await wallet.release(100);
      expect(await token.balanceOf(beneficiary.address)).to.eq(100);

      expect(await wallet.getReleasable()).to.eq(0);
    });
  });

  describe("With external funding", () => {
    it("Should release additional tokens before start", async () => {
      await token.transfer(wallet.address, 10);
      expect(await wallet.getReleasable()).to.eq(10);

      await wallet.release(10);
      expect(await token.balanceOf(beneficiary.address)).to.eq(10);

      expect(await wallet.getReleasable()).to.eq(0);
    });

    it("Should allow moving funds to approved contracts", async () => {
      expect(await wallet.getReleasable()).to.eq(0);

      await wallet.lock(20);

      expect(await locking.getMaxSlashableAmount(wallet.address)).to.eq(20);
    });

    it("Should allow moving funds to approved contracts", async () => {
      await wallet.lock(20);

      expect(await token.balanceOf(beneficiary.address)).to.eq(0);

      await time.setTime(now + 10 + 100 + 50);
      await wallet.release(30);
      expect(await token.balanceOf(beneficiary.address)).to.eq(30);

      expect(await wallet.getReleasable()).to.eq(0);
    });

    it("Should allow locking and unlocking", async () => {
      now += 1000;
      await time.setTimeAndMine(now);
      await deployContracts(10, 100, now + 10, 100, 100);

      expect(await wallet.getReleasable()).to.eq(0);

      await wallet.lock(20);

      expect(await locking.getMaxSlashableAmount(wallet.address)).to.eq(20);

      await wallet.requestUnlock(10);
      await time.setTime(now + 20);
      await wallet.completeUnlock();
      expect(await locking.getMaxSlashableAmount(wallet.address)).to.eq(10);
    });

    it("Should fail for another signer (not beneficiary) trying to lock or unlock", async () => {
      const walletWithAnotherSigner = wallet.connect(notBeneficiary);

      const expectFailure = (txPromise: Promise<Transaction>) =>
        expect(txPromise).to.be.revertedWith(
          "VestingWallet: only beneficiary can call this function"
        );

      await expectFailure(walletWithAnotherSigner.lock(1));
      await expectFailure(walletWithAnotherSigner.requestUnlock(1));
      await expectFailure(walletWithAnotherSigner.completeUnlock());
    });
  });
});
