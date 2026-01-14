import { TransactionReceipt } from "@ethersproject/providers";
import { RedstoneAdapterBase, RedstoneAdapterBaseAbi } from "@redstone-finance/evm-adapters";
import { ProviderWithAgreement } from "@redstone-finance/rpc-providers";
import { RedstoneCommon } from "@redstone-finance/utils";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { BigNumber, Contract, Wallet } from "ethers";
import { ethers } from "hardhat";
import { updateUsingOevAuction } from "../../src/custom-integrations/fastlane/update-using-oev-auction";
import { mockConfig } from "../helpers";
import { server, START_OEV_AUCTION_URL } from "./mock-server";

chai.use(chaiAsPromised);

const TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const AUCTION_VERIFICATION_TIMEOUT = 20;

const relayerConfig = mockConfig({
  oevAuctionUrl: START_OEV_AUCTION_URL,
  dataFeeds: ["BTC"],
  getBlockNumberTimeout: 20,
  oevAuctionVerificationTimeout: AUCTION_VERIFICATION_TIMEOUT,
});

const provider = new ProviderWithAgreement([ethers.provider, ethers.provider]);

describe("update-using-oev-auction", () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it("should update price using oev auction", async () => {
    provider.getGasPrice = () => Promise.resolve(BigNumber.from("1")); // gas price in transaction is 24000000000
    provider.waitForTransaction = async () => {
      await RedstoneCommon.sleep(5);
      return await Promise.resolve({ status: 1 } as TransactionReceipt);
    };
    const wallet = new Wallet(TEST_PRIVATE_KEY).connect(provider);

    const adapterContract = new Contract(
      "0x61ed8EBd497d11654e91f5faFeadaAF4cB125E0C",
      RedstoneAdapterBaseAbi,
      wallet
    );

    await updateUsingOevAuction(relayerConfig, "0x", adapterContract as RedstoneAdapterBase);
  });

  it("should throw exception before verification finishes", async () => {
    provider.getGasPrice = () => Promise.resolve(BigNumber.from("1")); // gas price in transaction is 24000000000
    provider.waitForTransaction = async () => {
      await RedstoneCommon.sleep(80);
      return await Promise.resolve({ status: 1 } as TransactionReceipt);
    };

    const wallet = new Wallet(TEST_PRIVATE_KEY).connect(provider);

    const adapterContract = new Contract(
      "0x61ed8EBd497d11654e91f5faFeadaAF4cB125E0C",
      RedstoneAdapterBaseAbi,
      wallet
    );

    try {
      await updateUsingOevAuction(relayerConfig, "0x", adapterContract as RedstoneAdapterBase);
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect((error as Error).message).to.include(
        `OEV Auction  verification didn't finish in ${AUCTION_VERIFICATION_TIMEOUT} [ms].`
      );
    }
  });
});
