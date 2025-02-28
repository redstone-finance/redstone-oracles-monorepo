import { AdapterType } from "@redstone-finance/on-chain-relayer-common";

export type PartialRelayerConfig = {
  chainId: number;
  adapterContractAddress: string;
  adapterContractType: AdapterType;
  adapterContractPackageId?: string;
  rpcUrls: string[];
  privateKey: string;
  gasLimit?: number;
  gasMultiplier?: number;
  maxTxSendAttempts?: number;
};
