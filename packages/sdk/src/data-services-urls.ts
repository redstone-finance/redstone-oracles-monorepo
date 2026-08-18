export const PROD_AUTHENTICATED_GATEWAY_URLS = ["https://oracle-gateway.a.redstone.finance"];
export const DEV_AUTHENTICATED_GATEWAY_URLS = ["https://oracle-gateway-api.b.redstone.finance"];

const AUTHENTICATED_GATEWAY_URLS_BY_DATA_SERVICE: Partial<Record<string, string[]>> = {
  "redstone-primary-prod": PROD_AUTHENTICATED_GATEWAY_URLS,
  "redstone-primary-demo": DEV_AUTHENTICATED_GATEWAY_URLS,
  "redstone-fast-demo": DEV_AUTHENTICATED_GATEWAY_URLS,
};

export const resolveAuthenticatedGatewayUrls = (dataServiceId: string): string[] =>
  AUTHENTICATED_GATEWAY_URLS_BY_DATA_SERVICE[dataServiceId] ?? PROD_AUTHENTICATED_GATEWAY_URLS;
