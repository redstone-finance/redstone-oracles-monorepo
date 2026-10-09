import { RedstoneCommon } from "@redstone-finance/utils";

export const API_TYPE_RPC = "rpc";
export const API_TYPE_HORIZON = "horizon";

const STELLAR_API_TYPES = [API_TYPE_RPC, API_TYPE_HORIZON] as const;
export type StellarApiType = (typeof STELLAR_API_TYPES)[number];

export class StellarApi {
  static parseUrl(urlString: string): RedstoneCommon.ApiSetup<StellarApiType> {
    return RedstoneCommon.parseUrl(urlString, API_TYPE_RPC, STELLAR_API_TYPES);
  }
}
