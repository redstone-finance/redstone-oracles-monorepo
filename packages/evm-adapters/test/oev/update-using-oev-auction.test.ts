import { TransactionReceipt } from "@ethersproject/providers";
import { HARDHAT_CHAIN_ID, RedstoneCommon } from "@redstone-finance/utils";
import { expect } from "chai";
import { BigNumber, Contract, providers, Wallet } from "ethers";
import { abi as RedstoneAdapterBaseAbi } from "../../artifacts/contracts/core/RedstoneAdapterBase.sol/RedstoneAdapterBase.json";
import { updateUsingOevAuction } from "../../src";
import { OevConfig } from "../../src/oev/oev-config";
import { RedstoneAdapterBase } from "../../typechain-types";
import { server, START_OEV_AUCTION_URL } from "./mock-server";

const TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const AUCTION_VERIFICATION_TIMEOUT = 20;
const CONTRACT_ADDRESS = "0x61ed8EBd497d11654e91f5faFeadaAF4cB125E0C";

const config: OevConfig = {
  networkId: HARDHAT_CHAIN_ID,
  adapterContractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  oevAuctionUrl: START_OEV_AUCTION_URL,
  getBlockNumberTimeout: 20,
  oevAuctionVerificationTimeout: AUCTION_VERIFICATION_TIMEOUT,
  oevResolveAuctionTimeout: 60_000,
  oevTotalTimeout: 60_000,
  oevVerifyGasPriceDisabled: false,
};

const provider = new providers.StaticJsonRpcProvider("http://localhost:8545", HARDHAT_CHAIN_ID);

describe("update-using-oev-auction", () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it("should update price using oev auction", async () => {
    provider.getGasPrice = () => Promise.resolve(BigNumber.from("1"));
    provider.waitForTransaction = async () => {
      await RedstoneCommon.sleep(5);

      return await Promise.resolve({ status: 1 } as TransactionReceipt);
    };
    const wallet = new Wallet(TEST_PRIVATE_KEY).connect(provider);

    const adapterContract = new Contract(CONTRACT_ADDRESS, RedstoneAdapterBaseAbi, wallet);

    await updateUsingOevAuction(config, "0x", adapterContract as RedstoneAdapterBase);
  });

  it("should throw exception before verification finishes", async () => {
    provider.getGasPrice = () => Promise.resolve(BigNumber.from("1"));
    provider.waitForTransaction = async () => {
      await RedstoneCommon.sleep(80);

      return await Promise.resolve({ status: 1 } as TransactionReceipt);
    };

    const wallet = new Wallet(TEST_PRIVATE_KEY).connect(provider);

    const adapterContract = new Contract(CONTRACT_ADDRESS, RedstoneAdapterBaseAbi, wallet);

    try {
      await updateUsingOevAuction(config, "0x", adapterContract as RedstoneAdapterBase);
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect((error as Error).message).to.include(
        `OEV Auction  verification didn't finish in ${AUCTION_VERIFICATION_TIMEOUT} [ms].`
      );
    }
  });
});
