import { PublicKey } from "@solana/web3.js";

export interface ISolanaGasOracle {
  getPriorityFeePerUnit(
    iterationIndex: number,
    lockedWritableAccounts: PublicKey[]
  ): Promise<number>;
}
