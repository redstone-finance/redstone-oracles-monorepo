import { RedstoneCommon } from "@redstone-finance/utils";

export const API_TYPE_LEGACY = "legacy";
export const API_TYPE_GRPC = "grpc";
export const API_TYPE_GRAPHQL = "graphql";

const SUI_API_TYPES = [API_TYPE_LEGACY, API_TYPE_GRPC, API_TYPE_GRAPHQL] as const;
export type SuiApiType = (typeof SUI_API_TYPES)[number];

export interface SuiApiSetup extends RedstoneCommon.ApiSetup<SuiApiType> {
  token?: string;
}

export class SuiApi {
  static parseUrl(urlString: string): SuiApiSetup {
    const setup = RedstoneCommon.parseUrl(urlString, API_TYPE_LEGACY, SUI_API_TYPES);

    return { ...setup, token: setup.params.get("token") ?? undefined };
  }
}
