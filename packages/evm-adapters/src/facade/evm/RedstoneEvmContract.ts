import { Contract } from "ethers";
import { MultiFeedAdapterWithoutRounds, RedstoneAdapterBase } from "../../../typechain-types";

export type RedstoneEvmContract = Contract & (MultiFeedAdapterWithoutRounds | RedstoneAdapterBase);
