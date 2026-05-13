import { loggerFactory } from "@redstone-finance/utils";
import _ from "lodash";

export type ApiType =
  | typeof API_TYPE_JSON
  | typeof API_TYPE_VALIDATOR
  | typeof API_TYPE_SCAN
  | typeof API_TYPE_SCAN_PROXY;

export const API_TYPE_JSON = "json-api";
export const API_TYPE_SCAN = "scan-api";
export const API_TYPE_SCAN_PROXY = "scan-api-proxy";
export const API_TYPE_VALIDATOR = "validator-api";

export type TokenProvider = () => Promise<string>;

export interface CantonApiSetup {
  baseUrl: string;
  type: string;
  clientId?: string;
  urlString: string;
}

export class CantonApi {
  protected readonly logger = loggerFactory("canton-api");

  constructor(
    readonly baseUrl: string,
    readonly tokenProvider?: TokenProvider
  ) {}

  static splitUrls(urlStrings: string[]) {
    const parsedUrls = urlStrings.map(CantonApi.parseUrl);

    return _.groupBy(parsedUrls, "type") as Partial<Record<ApiType, CantonApiSetup[]>>;
  }

  static parseUrl(urlString: string): CantonApiSetup {
    const url = new URL(urlString);
    const params = new URLSearchParams(url.hash.slice(1)); // removing '#'
    const type = (params.get("type") ?? API_TYPE_JSON) as ApiType;
    const clientId = params.get("clientId") ?? undefined;
    const baseUrl = url.origin + url.pathname;

    return { baseUrl, type, clientId, urlString };
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
