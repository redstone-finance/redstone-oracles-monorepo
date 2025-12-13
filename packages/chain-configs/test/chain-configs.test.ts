import chai from "chai";
import { z } from "zod";
import {
  ChainConfigSchema,
  getLocalChainConfigs,
  REDSTONE_MULTICALL3_ADDRESS,
  STANDARD_MULTICALL3_ADDRESS,
} from "../src";
import { skipIfDisabledOrNotSupported } from "./rpc-urls/common";

const CHAINS_TO_SKIP_RPC_PRESENCE_CHECK: string[] = [
  "MegaETH Testnet",
  "MegaETH Mainnet",
  "Stable Mainnet",
];

const CHAINS_TO_SKIP_REDSTONE_MULTICALL_ADDRESS_CHECK: string[] = [
  "Arbitrum Sepolia",
  "TAC Turin",
  "Westend Asset Hub",
  "Corn Maizenet",
  "zkLink",
  "zkSync",
  "Polygon Mainnet",
  "Incentiv Testnet",
  "0G Galileo Testnet",
  "MegaETH Mainnet",
];

const CHAINS_TO_SKIP_STANDARD_MULTICALL_ADDRESS_CHECK: string[] = ["Arbitrum Sepolia", "TAC Turin"];

const ChainConfigs = getLocalChainConfigs();

describe("Validate chain configs", () => {
  it("Scheme should be valid", () => {
    z.record(z.string(), ChainConfigSchema).parse(ChainConfigs);
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

describe("Validate multicall3", () => {
  describe("Redstone multicall3", () => {
    for (const chainConfig of Object.values(ChainConfigs)) {
      if (chainConfig.multicall3.type === "RedstoneMulticall3") {
        it(`Chain ${chainConfig.name} should have correct Redstone multicall3 address`, function () {
          skipIfDisabledOrNotSupported(
            this,
            chainConfig,
            CHAINS_TO_SKIP_REDSTONE_MULTICALL_ADDRESS_CHECK
          );
          chai
            .expect(
              chainConfig.multicall3.address,
              `Multicall3 address for chain ${chainConfig.name} doesn't match REDSTONE_MULTICALL3_ADDRESS`
            )
            .eq(REDSTONE_MULTICALL3_ADDRESS);
        });
      }
    }
  });

  describe("Standard multicall3", () => {
    for (const chainConfig of Object.values(ChainConfigs)) {
      if (chainConfig.multicall3.type === "Multicall3") {
        it(`Chain ${chainConfig.name} should have correct standard multicall3 address`, function () {
          skipIfDisabledOrNotSupported(
            this,
            chainConfig,
            CHAINS_TO_SKIP_STANDARD_MULTICALL_ADDRESS_CHECK
          );
          chai
            .expect(
              chainConfig.multicall3.address,
              `Multicall3 address for chain ${chainConfig.name} doesn't match STANDARD_MULTICALL3_ADDRESS`
            )
            .eq(STANDARD_MULTICALL3_ADDRESS);
        });
      }
    }
  });
});
