export interface BlockProvider {
  getBlockNumber(): Promise<number>;
}

export interface BalanceProvider {
  getBalance(addressOrName: string, blockTag?: number): Promise<bigint>;
}

export interface BlockchainService extends BlockProvider, BalanceProvider {
  getNormalizedBalance(address: string, blockNumber?: number): Promise<bigint>;
  getTimeForBlock(blockHeight: number): Promise<Date>;
  getInstanceTtls?: (addresses: string[], blockNumber?: number) => Promise<Date[]>;
}
