import { Signer } from "@ethersproject/abstract-signer";
import { Web3Provider } from "@ethersproject/providers";
import { HARDHAT_CHAIN_ID, RedstoneCommon } from "@redstone-finance/utils";
import { createHardhatNetworkProvider } from "hardhat/internal/hardhat-network/provider/provider";

const DEV_ACCOUNT_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const DEV_ACCOUNT_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const DEV_ACCOUNT_BALANCE = "10000000000000000000000";

export type InProcessEvm = {
  signer: Signer;
  advanceTimeTo: (date: Date) => Promise<void>;
  reset: () => Promise<void>;
};

let evmPromise: Promise<InProcessEvm> | undefined;

export const getInProcessEvm = () => {
  evmPromise ??= createInProcessEvm();

  return evmPromise;
};

const createInProcessEvm = async () => {
  const eip1193Provider = await createHardhatNetworkProvider(
    {
      hardfork: "cancun",
      chainId: HARDHAT_CHAIN_ID,
      networkId: HARDHAT_CHAIN_ID,
      blockGasLimit: 60_000_000,
      minGasPrice: 0n,
      automine: true,
      intervalMining: 0,
      mempoolOrder: "priority",
      chains: new Map(),
      genesisAccounts: [{ privateKey: DEV_ACCOUNT_PRIVATE_KEY, balance: DEV_ACCOUNT_BALANCE }],
      allowUnlimitedContractSize: true,
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      allowBlocksWithSameTimestamp: true,
      initialDate: new Date(),
      enableTransientStorage: false,
      enableRip7212: false,
    },
    { enabled: false }
  );

  const provider = new Web3Provider(eip1193Provider);
  const signer = provider.getSigner(DEV_ACCOUNT_ADDRESS);

  return <InProcessEvm>{
    signer,
    advanceTimeTo: async (date: Date) => {
      await provider.send("evm_setNextBlockTimestamp", [
        Math.floor(RedstoneCommon.msToSecs(date.getTime())),
      ]);
      await provider.send("evm_mine", []);
    },
    reset: async () => {
      await provider.send("hardhat_reset", []);
    },
  };
};
