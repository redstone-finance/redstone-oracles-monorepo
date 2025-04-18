import { PublicKey } from "@solana/web3.js";

export interface ISolanaGasOracle {
  getPriorityFeePerUnit(
    lockedWritableAccounts: PublicKey[],
    iterationIndex: number
  ): Promise<number>;
}
