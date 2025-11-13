import { AdapterType } from "@redstone-finance/on-chain-relayer-common";
import { NetworkId } from "@redstone-finance/utils";

export type PartialRelayerConfig = {
  networkId: NetworkId;
  chainName: string;
  adapterContractAddress: string;
  adapterContractType: AdapterType;
  adapterContractPackageId?: string;
  rpcUrls: string[];
  privateKey: string;
  gasLimit?: number;
  gasMultiplier?: number;
  maxTxSendAttempts?: number;
  expectedTxDeliveryTimeInMS?: number;
};
