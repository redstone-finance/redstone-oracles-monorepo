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

  async waitForTransaction(txId: string) {
    const receipt = await this.provider.waitForTransaction(txId);

    return receipt.status === 1;
  }

  async getNormalizedBalance(address: string, blockNumber?: number) {
    return (await this.provider.getBalance(address, blockNumber)).toBigInt();
  }
}
