import { RedstoneCommon } from "@redstone-finance/utils";

export const API_TYPE_RPC = "rpc";
export const API_TYPE_JITO = "jito";

const SOLANA_API_TYPES = [API_TYPE_RPC, API_TYPE_JITO] as const;
export type SolanaApiType = (typeof SOLANA_API_TYPES)[number];

export type SolanaApiSetup = RedstoneCommon.ApiSetup<SolanaApiType>;

export class SolanaApi {
  static parseUrl(urlString: string): SolanaApiSetup {
    return RedstoneCommon.parseUrl(urlString, API_TYPE_RPC, SOLANA_API_TYPES);
  }
}
