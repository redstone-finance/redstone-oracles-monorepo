import { BalanceProvider } from "../provider/balance-provider";

export interface IBlockchainService extends BalanceProvider {
  getTimeForBlock(blockHeight: number): Promise<Date>;
}
