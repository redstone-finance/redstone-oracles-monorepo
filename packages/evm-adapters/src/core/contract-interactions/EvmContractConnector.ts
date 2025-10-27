import { IContractConnector } from "@redstone-finance/sdk";
import { providers } from "ethers";
import { IRedstoneContractAdapter } from "./IRedstoneContractAdapter";

export class EvmContractConnector<Adapter extends IRedstoneContractAdapter>
  implements IContractConnector<Adapter>
{
  constructor(
    private provider: providers.Provider,
    private adapter: Adapter
  ) {}

  getAdapter() {
    return Promise.resolve(this.adapter);
  }

  getBlockNumber() {
    return this.provider.getBlockNumber();
  }

  /**
   * In the case where an EVM transaction is already awaited in TxDeliveryMan, there is no need to wait for it again.
   * Additionally, waiting again is inefficient because it blocks the main loop from delivering the next transaction.
   */
  waitForTransaction(_txId: string) {
    return Promise.resolve(true);
  }

  async getNormalizedBalance(address: string, blockNumber?: number) {
    return (await this.provider.getBalance(address, blockNumber)).toBigInt();
  }
}
