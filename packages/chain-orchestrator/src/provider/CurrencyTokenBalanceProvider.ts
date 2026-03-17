import { BalanceProvider, BlockProvider } from "@redstone-finance/multichain-kit";
import { RedstoneCommon } from "@redstone-finance/utils";
import { Contract, providers } from "ethers";

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
    const contract = new Contract(
      erc20TokenAddress,
      RedstoneCommon.Erc20Abi,
      this.provider
    ) as RedstoneCommon.Erc20Contract;

    return blockTag
      ? await contract.callStatic.balanceOf(addressOrName, { blockTag })
      : await contract.callStatic.balanceOf(addressOrName);
  }
}
