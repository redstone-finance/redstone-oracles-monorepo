import type { GasOracleFn } from "./common";
import { kavaGasOracle } from "./custom-gas-oracles/kava";
import { megaEthGasOracle } from "./custom-gas-oracles/megaEth";

export const CHAIN_ID_TO_GAS_ORACLE = {
  2222: kavaGasOracle,
  4326: megaEthGasOracle,
} as Record<number, GasOracleFn | undefined>;
