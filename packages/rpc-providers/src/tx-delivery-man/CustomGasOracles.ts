import type { GasOracleFn } from "./common";
import { kavaGasOracle } from "./custom-gas-oracles/kava";
import { merlinGasOracle } from "./custom-gas-oracles/merlin";

export const CHAIN_ID_TO_GAS_ORACLE = {
  2222: kavaGasOracle,
  4200: merlinGasOracle,
} as Record<number, GasOracleFn | undefined>;
