import { RedstoneCommon } from "@redstone-finance/utils";
import chai from "chai";
import { providers } from "ethers";
import { ChainConfig, getLocalChainConfigs } from "../src";
import { skipIfDisabledOrNotSupported } from "./rpc-urls/common";

const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 3,
  waitBetweenMs: 1000,
};

const CHAINS_TO_SKIP_EXTERNAL_CONFIG: string[] = ["Arbitrum Sepolia", "Haven1"];

const ChainConfigs = getLocalChainConfigs();

if (process.env.RUN_NONDETERMINISTIC_TESTS) {
  describe("Validate multicall3 - external", () => {
    for (const chainConfig of Object.values(ChainConfigs)) {
      if (
        chainConfig.publicRpcUrls.length === 0 ||
        chainConfig.publicRpcUrls[0].includes("localhost")
      ) {
        continue;
      }

      it(`Chain config for chain ${chainConfig.name} (${chainConfig.networkId}) should have a valid multicall3 address`, async function () {
        skipIfDisabledOrNotSupported(
          this,
          chainConfig,
          CHAINS_TO_SKIP_EXTERNAL_CONFIG
        );
        try {
          await verifyMulticallAddress(chainConfig);
        } catch (e) {
          console.log(
            `multicall verification failed for ${chainConfig.name} (${chainConfig.networkId}), error ${RedstoneCommon.stringifyError(e)} `
          );
          throw e;
        }
      });
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
