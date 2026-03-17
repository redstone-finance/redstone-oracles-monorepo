export interface BlockProvider {
  getBlockNumber(): Promise<number>;
}

export interface BalanceProvider {
  getBalance(addressOrName: string, blockTag?: number): Promise<bigint>;
}

export interface BlockchainService extends BlockProvider, BalanceProvider {
  getBlockNumber(): Promise<number>;
  getNormalizedBalance(address: string, blockNumber?: number): Promise<bigint>;
  getBalance(addressOrName: string, blockTag?: number): Promise<bigint>;
  getInstanceTtls?: (addresses: string[], blockNumber?: number) => Promise<Date[]>;
  getTimeForBlock(blockHeight: number): Promise<Date>;
}
