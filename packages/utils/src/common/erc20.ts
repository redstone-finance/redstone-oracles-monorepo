import { BigNumber, Contract } from "ethers";

export type ContractCallOverrides = { blockTag: string | number };

export interface Erc20Contract extends Contract {
  callStatic: {
    balanceOf: (account: string, overrides?: ContractCallOverrides) => Promise<BigNumber>;
    totalSupply: (overrides?: ContractCallOverrides) => Promise<BigNumber>;
    decimals: (overrides?: ContractCallOverrides) => Promise<number>;
  };
}

export const Erc20Abi = [
  "function balanceOf(address arg0) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount)",
] as const;
