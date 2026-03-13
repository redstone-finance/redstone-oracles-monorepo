import { BalanceProvider } from "../provider/BalanceProvider";

export interface IBlockchainService extends BalanceProvider {
  getTimeForBlock(blockHeight: number): Promise<Date>;
}
