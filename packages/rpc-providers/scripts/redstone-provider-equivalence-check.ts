/* eslint-disable */
// @ts-nocheck
import { StaticJsonRpcProvider } from "@ethersproject/providers";
import { HttpClient } from "@redstone-finance/http-client";
import assert from "assert";
import { ethers, Wallet } from "ethers";
import hardhat from "hardhat";
import {
  RedstoneEthers5Provider,
  RedstoneProvider,
} from "../src/providers/RedstoneProvider";
import { Counter } from "../typechain-types";
import {HARDHAT_CHAIN_ID} from "../src";

// HOW TO RUN
// npx hardhat node &
// wait
// ts-node scripts/redstone-provider-equivalence-check.ts

const RPC_URL_ETH = "http://localhost:8545";
const TEST_WALLET = new Wallet(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
);

const httpOptions = {
  maxSockets: 100,
  maxTotalSockets: 1000,
  keepAliveMsecs: 60_000,
  keepAlive: true,
  scheduling: "fifo" as const,
  maxContentLength: 10_000_000,
  timeout: 3_000,
  retryOptions: {
    retries: 1,
    delayMs: 100,
  },
};

const ZERO_BYTES32 = "0x" + "0".repeat(64);
const SIMPLE_METHODS_TO_TEST = [];

export async function deployCounter(
  provider: ethers.providers.Provider
): Promise<Counter> {
  const wallet = TEST_WALLET.connect(provider);
  const factory = await hardhat.ethers.getContractFactory("Counter", wallet);
  const contract = await factory.deploy(TEST_WALLET.address);
  await contract.deployed();
  return contract;
}

async function main() {
  const http = new HttpClient(httpOptions);
  const rpc = new RedstoneProvider(http, RPC_URL_ETH);
  const redP = new RedstoneEthers5Provider(
    rpc,
    {
      chainId: HARDHAT_CHAIN_ID,
      name: "hardhat",
    },
    500,
    60_000
  );
  const ethersP = new StaticJsonRpcProvider(RPC_URL_ETH, {
    chainId: HARDHAT_CHAIN_ID,
    name: "hardhat",
  });

  const counter = await deployCounter(ethersP);
  const sampleTx = await counter.inc();

  const blockNumber = await ethersP.getBlockNumber();
  await testEquality(redP, ethersP, "getBlockNumber", []);

  await testEquality(redP, ethersP, "getGasPrice", []);

  await testEquality(redP, ethersP, "getFeeData", []);

  await testEquality(redP, ethersP, "getBalance", [
    TEST_WALLET.address,
    blockNumber,
  ]);
  await TEST_WALLET.connect(ethersP).sendTransaction({
    to: "0x" + "0".repeat(40),
    value: 100,
  });
  await testEquality(redP, ethersP, "getBalance", [TEST_WALLET.address]);
  await testEquality(redP, ethersP, "getBalance", [TEST_WALLET.address]);

  await testEquality(redP, ethersP, "getTransactionCount", [
    TEST_WALLET.address,
  ]);

  await testEquality(redP, ethersP, "getCode", [TEST_WALLET.address]);
  await testEquality(redP, ethersP, "getCode", [counter.address]);

  await testEquality(redP, ethersP, "getStorageAt", [
    TEST_WALLET.address,
    "0x0",
  ]);
  await testEquality(redP, ethersP, "getStorageAt", [counter.address, "0x0"]);

  // TODO: something to think of Ethers Provider is not trating 0x response as errors
  // which rpc reports as errors, we have even Decorator for that Treat0xAsErrorDecorator
  // await testEquality(redP, ethersP, "call", [
  //   { to: counter.address, data: "0x" },
  // ]);
  await testEquality(redP, ethersP, "call", [
    { to: counter.address, data: "0xa87d942c" },
  ]);
  const blockNumberBeforeInc = await ethersP.getBlockNumber();
  await counter.inc();
  await testEquality(redP, ethersP, "call", [
    { to: counter.address, data: "0xa87d942c" },
  ]);
  await testEquality(redP, ethersP, "call", [
    { to: counter.address, data: "0xa87d942c" },
    blockNumberBeforeInc,
  ]);

  await testEquality(redP, ethersP, "estimateGas", [
    { to: counter.address, data: "0xa87d942c" },
  ]);

  // ethers is caching block number that is why we have to call getBlockNumber explicite before
  // otherwise confirmations number would not match
  await testEquality(redP, ethersP, "getBlockNumber", []);
  await testEquality(
    redP,
    ethersP,
    "getTransaction",
    [sampleTx.hash],
    ["wait"]
  );
  await testEquality(redP, ethersP, "getBlockNumber", []);
  await testEquality(redP, ethersP, "getTransaction", [ZERO_BYTES32], ["wait"]);

  await testEquality(
    redP,
    ethersP,
    "getTransactionReceipt",
    [sampleTx.hash],
    []
  );
  await testEquality(
    redP,
    ethersP,
    "getTransactionReceipt",
    [ZERO_BYTES32],
    []
  );

  await testEquality(
    redP,
    ethersP,
    "getLogs",
    [{ fromBlock: 0, toBlock: "latest", address: counter.address }],
    []
  );
  await testEquality(
    redP,
    ethersP,
    "getLogs",
    [{ toBlock: "latest", address: counter.address }],
    []
  );
  await testEquality(redP, ethersP, "getLogs", [{ toBlock: "latest" }], []);
  await testEquality(
    redP,
    ethersP,
    "getLogs",
    [
      {
        topics: [
          "0x3443590b7333fb7cfd5e65585c8a4c4100c345929865db522919623bf37e5808",
        ],
      },
    ],
    []
  );
  await testEquality(
    redP,
    ethersP,
    "getLogs",
    [
      {
        topics: [
          [
            "0x3443590b7333fb7cfd5e65585c8a4c4100c345929865db522919623bf37e5808",
          ],
        ],
      },
    ],
    []
  );

  await testEquality(redP, ethersP, "getBlock", [blockNumber], []);
  await testEquality(
    redP,
    ethersP,
    "getBlock",
    ["0x" + Number.parseInt(blockNumber, 16)],
    []
  );
  await testEquality(redP, ethersP, "getBlock", ["latest"], []);
  await testEquality(redP, ethersP, "getBlock", [1e10], []);

  await testEquality(
    redP,
    ethersP,
    "getBlockWithTransactions",
    [blockNumber],
    []
  );
  await testEquality(
    redP,
    ethersP,
    "getBlockWithTransactions",
    ["0x" + Number.parseInt(blockNumber, 16)],
    []
  );
  await testEquality(redP, ethersP, "getBlockWithTransactions", ["latest"], []);
  await testEquality(redP, ethersP, "getBlockWithTransactions", [1e10], []);

  await testEquality(redP, ethersP, "waitForTransaction", [sampleTx.hash], []);
  await testEquality(
    redP,
    ethersP,
    "waitForTransaction",
    [ZERO_BYTES32, 1, 1000],
    []
  );

  let error;
  const redCounter = counter.connect(TEST_WALLET.connect(redP));

  // check basic contract interactions
  const countFirst = await redCounter.getCount();
  await redCounter.inc();
  await redCounter.incBy(10);
  const countSecond = await redCounter.getCount();
  assert.deepStrictEqual(countFirst.add(11), countSecond);
  [error] = await Promise.allSettled([counter.fail()]);
  assert.equal(error.reason.code, ethers.errors.CALL_EXCEPTION);

  await testEquality(redCounter, counter, "inc", [{ gasLimit: 1 }]);
  await testEquality(redCounter, counter, "inc", [{ nonce: 1 }]);
  await testEquality(redCounter, counter, "inc", [{ gasPrice: 0 }]);
  await testEquality(redCounter, counter, "inc", [{ gasPrice: 1e26 }]);

  const emptyWallet = Wallet.createRandom();
  await testEquality(
    redCounter.connect(emptyWallet.connect(redP)),
    counter.connect(emptyWallet.connect(ethersP)),
    "inc",
    []
  );
}

main();

async function testEquality(
  redP: any,
  ethersP: any,
  method: string,
  params: unknown[],
  excludeFromComparison: string[] = []
) {
  const [redstoneResult, ethersResult] = await Promise.allSettled([
    redP[method](...params),
    ethersP[method](...params),
  ]);

  // remove wait function from comparison (not good idea to compare functions)
  if (method === "getBlockWithTransactions") {
    if (redstoneResult.value && ethersResult.value) {
      for (let i = 0; i < redstoneResult.value.transactions.length; ++i) {
        delete redstoneResult.value.transactions[i].wait;
        delete ethersResult.value.transactions[i].wait;
      }
    }
  }

  if (["getTransactionReceipt", "waitForTransaction"].includes(method)) {
    if (redstoneResult.value && ethersResult.value) {
      for (const log of redstoneResult.value.logs) {
        // ethers doesn't include key instead of returning false
        if (!log.removed) {
          delete log.removed;
        }
      }
    }
  }

  for (const key of excludeFromComparison) {
    if (
      redstoneResult.status === "fulfilled" &&
      ethersResult.status === "fulfilled" &&
      redstoneResult.value !== null &&
      ethersResult.value !== null
    ) {
      delete redstoneResult.value[key];
      delete ethersResult.value[key];
    }
  }

  // in case of error we compe only codes
  if (
    redstoneResult.status === "rejected" &&
    ethersResult.status === "rejected"
  ) {
    assert.deepStrictEqual(
      redstoneResult.reason.code,
      ethersResult.reason.code,
      `Failed comparison method=${method} params=${JSON.stringify(params)}`
    );
  } else {
    assert.deepStrictEqual(
      redstoneResult,
      ethersResult,
      `Failed comparison method=${method} params=${JSON.stringify(params)}`
    );
  }
}
