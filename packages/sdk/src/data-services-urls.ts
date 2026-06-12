type Gateway = {
  url: string;
  historical: boolean;
  metadata: boolean;
};

export const PROD_AUTHENTICATED_GATEWAY_URLS = ["https://oracle-gateway.a.redstone.finance"];
export const DEV_AUTHENTICATED_GATEWAY_URLS = ["https://oracle-gateway-api.b.redstone.finance"];

const AUTHENTICATED_GATEWAY_URLS_BY_DATA_SERVICE: Partial<Record<string, string[]>> = {
  "redstone-primary-prod": PROD_AUTHENTICATED_GATEWAY_URLS,
  "redstone-primary-demo": DEV_AUTHENTICATED_GATEWAY_URLS,
  "redstone-main-demo": DEV_AUTHENTICATED_GATEWAY_URLS,
  "redstone-fast-demo": DEV_AUTHENTICATED_GATEWAY_URLS,
};

export const resolveAuthenticatedGatewayUrls = (dataServiceId: string): string[] =>
  AUTHENTICATED_GATEWAY_URLS_BY_DATA_SERVICE[dataServiceId] ?? PROD_AUTHENTICATED_GATEWAY_URLS;

// GCP gateways don't support metadata, AWS prod1 doesn't support historical data
const allReadGateways = {
  dev1_gcp: {
    url: "https://oracle-gateway-1.b.redstone.vip",
    historical: true,
    metadata: false,
  },
  dev1_aws: {
    url: "https://oracle-gateway-1.b.redstone.finance",
    historical: true,
    metadata: true,
  },
  prod1_gcp: {
    url: "https://oracle-gateway-1.a.redstone.vip",
    historical: false,
    metadata: false,
  },
  prod1_aws: {
    url: "https://oracle-gateway-1.a.redstone.finance",
    historical: false,
    metadata: true,
  },
  prod2_aws: {
    url: "https://oracle-gateway-2.a.redstone.finance",
    historical: true,
    metadata: true,
  },
  local: {
    url: "http://localhost:3000",
    historical: true,
    metadata: true,
  },
  unit_tests: {
    url: "http://valid-cache.com",
    historical: true,
    metadata: true,
  },
};

const DEV_GWS = [allReadGateways.dev1_aws, allReadGateways.dev1_gcp];

// order matters here, as the first gateway is being tried first by requestDataPackages function
const PROD_GWS = [allReadGateways.prod2_aws, allReadGateways.prod1_gcp, allReadGateways.prod1_aws];

const REDSTONE_DATA_SERVICES_URLS: Partial<Record<string, Gateway[]>> = {
  "redstone-primary-prod": PROD_GWS,
  "redstone-primary-demo": DEV_GWS,
  "redstone-main-demo": DEV_GWS,
  "redstone-fast-demo": DEV_GWS,
  "mock-data-service": [allReadGateways.local],
  "mock-data-service-tests": [allReadGateways.unit_tests],
};

export const resolveDataServiceUrls = (
  dataServiceId: string,
  { historical = false, metadata = false } = {}
): string[] => {
  const gateways = REDSTONE_DATA_SERVICES_URLS[dataServiceId];
  if (!gateways) {
    throw new Error(`Data service ${dataServiceId} is not configured by RedStone protocol`);
  }

  return gateways
    .filter((gateway) => (!historical || gateway.historical) && (!metadata || gateway.metadata))
    .map((gw) => gw.url);
};
