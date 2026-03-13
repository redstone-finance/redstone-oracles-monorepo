import { BigNumber } from "ethers";

export interface BalanceProvider {
  getBalance(addressOrName: string, blockTag?: number): Promise<BigNumber | bigint>;
  getBlockNumber(): Promise<number>;
}
