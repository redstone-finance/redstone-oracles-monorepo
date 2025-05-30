import { RedstoneCommon } from "@redstone-finance/utils";
import chai from "chai";
import { providers } from "ethers";
import { z } from "zod";
import {
  ChainConfig,
  ChainConfigSchema,
  getLocalChainConfigs,
  isEvmChainType,
  REDSTONE_MULTICALL3_ADDRESS,
  STANDARD_MULTICALL3_ADDRESS,
} from "../src";
import { skipIfDisabledOrNotSupported } from "./rpc-urls/common";

const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 3,
  waitBetweenMs: 1000,
};

const CHAINS_TO_SKIP_MULTICALL_ADDRESS_CHECK = [
  "zkSync",
  "zkLink",
  "Haven1 Testnet",
  "TAC Turin",
  "Corn Maizenet", // first few create transactions failed leading to different address
  "Polygon Mainnet",
  "Westend Asset Hub",
  "zkSync",
  "zkLink",
];

const CHAINS_TO_SKIP_RPC_PRESENCE_CHECK = [
  "Monad Devnet",
  "Hemi Network",
  "megaEth Testnet",
];

const ChainConfigs = getLocalChainConfigs();

describe("Validate chain configs", () => {
  it("Scheme should be valid", () => {
    z.record(ChainConfigSchema).parse(ChainConfigs);
  });

  it("Each chain config should have at least one publicRpcProvider", () => {
    for (const chainConfig of Object.values(ChainConfigs)) {
      if (!CHAINS_TO_SKIP_RPC_PRESENCE_CHECK.includes(chainConfig.name)) {
        chai
          .expect(
            chainConfig.publicRpcUrls.length,
            `No publicRpcProvider set for ${chainConfig.name}`
          )
          .greaterThanOrEqual(1);
      }
    }
  });
});

function shouldCheckMulticall(chainConfig: ChainConfig) {
  return (
    isEvmChainType(chainConfig.chainType) &&
    !CHAINS_TO_SKIP_MULTICALL_ADDRESS_CHECK.includes(chainConfig.name)
  );
}

describe("Validate multicall3", () => {
  it(`Each redstone multicall3 should have the same address`, function () {
    for (const chainConfig of Object.values(ChainConfigs)) {
      if (
        chainConfig.multicall3.type === "RedstoneMulticall3" &&
        shouldCheckMulticall(chainConfig)
      ) {
        chai
          .expect(
            chainConfig.multicall3.address,
            `Multicall3 address for chain ${chainConfig.name} doesn't match REDSTONE_MULTICALL3_ADDRESS`
          )
          .eq(REDSTONE_MULTICALL3_ADDRESS);
      }
    }
  });

  it(`Each standard multicall3 should have the same address`, function () {
    for (const chainConfig of Object.values(ChainConfigs)) {
      if (
        chainConfig.multicall3.type === "Multicall3" &&
        shouldCheckMulticall(chainConfig)
      ) {
        chai
          .expect(
            chainConfig.multicall3.address,
            `Multicall3 address for chain ${chainConfig.name} doesn't match STANDARD_MULTICALL3_ADDRESS`
          )
          .eq(STANDARD_MULTICALL3_ADDRESS);
      }
    }
  });

  for (const chainConfig of Object.values(ChainConfigs)) {
    if (
      chainConfig.publicRpcUrls.length === 0 ||
      chainConfig.publicRpcUrls[0].includes("localhost")
    ) {
      continue;
    }

    it(`Chain config for chain ${chainConfig.name} (${chainConfig.chainId}) should have a valid multicall3 address`, async function () {
      skipIfDisabledOrNotSupported(this, chainConfig);
      try {
        await verifyMulticallAddress(chainConfig);
      } catch (e) {
        console.log(
          `multicall verification failed for ${chainConfig.name} (${chainConfig.chainId}), error ${RedstoneCommon.stringifyError(e)} `
        );
        throw e;
      }
    });
  }

  async function verifyMulticallAddress(chainConfig: ChainConfig, index = 0) {
    const provider = new providers.StaticJsonRpcProvider(
      chainConfig.publicRpcUrls[index]
    );

    try {
      const multicallCode = await RedstoneCommon.retry({
        ...RETRY_CONFIG,
        fn: async () =>
          await RedstoneCommon.timeout(
            provider.getCode(chainConfig.multicall3.address),
            1500
          ),
        fnName: "provider.getCode",
      })();

      chai
        .expect(multicallCode.length, "Multicall implementation missing")
        .greaterThan(2);
    } catch (e) {
      console.log(
        `${chainConfig.name} - RPC ${chainConfig.publicRpcUrls[index]} failed.`
      );
      if (index === chainConfig.publicRpcUrls.length - 1) {
        console.log(`${chainConfig.name} - All RPCs failed`);
        throw e;
      }

      await verifyMulticallAddress(chainConfig, index + 1);
    }
  }
});
