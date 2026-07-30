import * as providers from "@ethersproject/providers";
import { BalanceProvider, BlockProvider } from "@redstone-finance/multichain-kit";
import { Erc20Abi, Erc20Contract, evmContract } from "@redstone-finance/rpc-providers";

export class CurrencyTokenBalanceProvider implements BalanceProvider, BlockProvider {
  constructor(
    private readonly provider: providers.Provider,
    private readonly currencyTokenAddress: string
  ) {}

  async getBalance(addressOrName: string, blockTag?: number) {
    return (await this.balanceOf(this.currencyTokenAddress, addressOrName, blockTag)).toBigInt();
  }

  getBlockNumber() {
    return this.provider.getBlockNumber();
  }

  private async balanceOf(erc20TokenAddress: string, addressOrName: string, blockTag?: number) {
    const contract = evmContract<Erc20Contract>(erc20TokenAddress, Erc20Abi, this.provider);

    return blockTag
      ? await contract.callStatic.balanceOf(addressOrName, { blockTag })
      : await contract.callStatic.balanceOf(addressOrName);
  }
}
