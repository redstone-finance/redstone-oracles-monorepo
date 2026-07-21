import { NetworkId } from "@redstone-finance/utils";

export type OevConfig = {
  networkId: NetworkId;
  adapterContractAddress: string;
  getBlockNumberTimeout: number;
  oevAuctionUrl?: string;
  oevAuctionApiKey?: string;
  oevResolveAuctionTimeout: number;
  oevTotalTimeout: number;
  oevAuctionVerificationTimeout?: number;
  oevVerifyGasPriceDisabled: boolean;
};
