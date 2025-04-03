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

  /** In case in EVM transaction is already await in TxDeliveryMan so there is no sens in waiting for it again */
  waitForTransaction(_txId: string) {
    return Promise.resolve(true);
  }

  async getNormalizedBalance(address: string, blockNumber?: number) {
    return (await this.provider.getBalance(address, blockNumber)).toBigInt();
  }
}
