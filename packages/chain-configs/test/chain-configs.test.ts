import { isEvmNetworkId } from "@redstone-finance/utils";
import chai from "chai";
import { z } from "zod";
import {
  ChainConfig,
  ChainConfigSchema,
  getLocalChainConfigs,
  REDSTONE_MULTICALL3_ADDRESS,
  STANDARD_MULTICALL3_ADDRESS,
} from "../src";

const CHAINS_TO_SKIP_MULTICALL_ADDRESS_CHECK = [
  "zkSync",
  "zkLink",
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
    isEvmNetworkId(chainConfig.networkId) &&
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
});
