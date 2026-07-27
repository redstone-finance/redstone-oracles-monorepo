import { Contract } from "@ethersproject/contracts";
import { MultiFeedAdapterWithoutRounds, RedstoneAdapterBase } from "../../../typechain-types";

export type RedstoneEvmContract = Contract & (MultiFeedAdapterWithoutRounds | RedstoneAdapterBase);
