import chai from "chai";
import { z } from "zod";
import {
  ChainConfigSchema,
  getLocalChainConfigs,
  REDSTONE_MULTICALL3_ADDRESS,
  STANDARD_MULTICALL3_ADDRESS,
} from "../src";
import { skipIfDisabledOrNotSupported } from "./rpc-urls/common";

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

describe("Validate multicall3", () => {
  it(`Each redstone multicall3 should have the same address`, function () {
    for (const chainConfig of Object.values(ChainConfigs)) {
      if (chainConfig.multicall3.type === "RedstoneMulticall3") {
        skipIfDisabledOrNotSupported(this, chainConfig);
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
      if (chainConfig.multicall3.type === "Multicall3") {
        skipIfDisabledOrNotSupported(this, chainConfig);
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
