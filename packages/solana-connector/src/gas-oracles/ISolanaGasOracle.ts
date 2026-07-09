import { PublicKey } from "@solana/web3.js";

export interface ISolanaGasOracle {
  getPriorityFeePerUnit(
    iterationIndex: number,
    lockedWritableAccounts: PublicKey[],
    computeUnits: number
  ): Promise<number>;
}
