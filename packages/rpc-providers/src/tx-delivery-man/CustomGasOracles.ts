import type { GasOracleFn } from "./common";
import { blockscoutStatsGasOracle } from "./custom-gas-oracles/blockscout-stats-gas-oracle";
import { kavaGasOracle } from "./custom-gas-oracles/kava";
import { merlinGasOracle } from "./custom-gas-oracles/merlin";

const ETHERLINK_GHOSTNET_BLOCKSCOUT_EXPLORER_BASE_URL = `https://testnet.explorer.etherlink.com`;

export const CHAIN_ID_TO_GAS_ORACLE = {
  2222: kavaGasOracle,
  128123: blockscoutStatsGasOracle(
    ETHERLINK_GHOSTNET_BLOCKSCOUT_EXPLORER_BASE_URL
  ),
  4200: merlinGasOracle,
} as Record<number, GasOracleFn | undefined>;
