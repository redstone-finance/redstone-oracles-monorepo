import { RedstoneCommon } from "@redstone-finance/utils";

export const API_TYPE_FULLNODE = "fullnode";
export const API_TYPE_INDEXER = "indexer";

const MOVE_API_TYPES = [API_TYPE_FULLNODE, API_TYPE_INDEXER] as const;
export type MoveApiType = (typeof MOVE_API_TYPES)[number];

export interface MoveApiSetup extends RedstoneCommon.ApiSetup<MoveApiType> {
  apiKey?: string;
}

export class MoveApi {
  static parseUrl(urlString: string): MoveApiSetup {
    const setup = RedstoneCommon.parseUrl(urlString, API_TYPE_FULLNODE, MOVE_API_TYPES);

    return { ...setup, apiKey: setup.params.get("apiKey") ?? undefined };
  }
}
