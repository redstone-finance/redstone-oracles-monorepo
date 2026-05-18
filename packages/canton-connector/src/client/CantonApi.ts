import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";

export const API_TYPE_JSON = "json-api";
export const API_TYPE_SCAN = "scan-api";
export const API_TYPE_SCAN_PROXY = "scan-api-proxy";
export const API_TYPE_VALIDATOR = "validator-api";

const CANTON_API_TYPES = [
  API_TYPE_JSON,
  API_TYPE_SCAN,
  API_TYPE_SCAN_PROXY,
  API_TYPE_VALIDATOR,
] as const;
export type ApiType = (typeof CANTON_API_TYPES)[number];

export type TokenProvider = () => Promise<string>;

export interface CantonApiSetup extends RedstoneCommon.ApiSetup<ApiType> {
  clientId?: string;
}

export class CantonApi {
  protected readonly logger = loggerFactory("canton-api");

  constructor(
    readonly baseUrl: string,
    readonly tokenProvider?: TokenProvider
  ) {}

  static parseUrl(urlString: string): CantonApiSetup {
    const setup = RedstoneCommon.parseUrl(urlString, API_TYPE_JSON, CANTON_API_TYPES);

    return { ...setup, clientId: setup.params.get("clientId") ?? undefined };
  }

  protected async logPerf<T>(fn: () => Promise<T>, label: string): Promise<T> {
    const startTime = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - startTime;
      this.logger.info(`${label}: ${duration}[ms]`, { duration });
    }
  }
}
