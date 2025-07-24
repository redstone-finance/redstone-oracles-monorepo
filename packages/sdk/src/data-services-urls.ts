type Gateway = {
  url: string;
  historical: boolean;
  metadata: boolean;
};

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
    historical: true,
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

const PROD_GWS = [
  allReadGateways.prod1_gcp,
  allReadGateways.prod1_aws,
  allReadGateways.prod2_aws,
];

const REDSTONE_DATA_SERVICES_URLS: Partial<Record<string, Gateway[]>> = {
  "redstone-primary-prod": PROD_GWS,
  "redstone-avalanche-prod": PROD_GWS,
  "redstone-arbitrum-prod": PROD_GWS,
  "redstone-primary-demo": DEV_GWS,
  "redstone-main-demo": DEV_GWS,
  "redstone-fast-demo": DEV_GWS,
  "redstone-avalanche-demo": DEV_GWS,
  "redstone-arbitrum-demo": DEV_GWS,
  "mock-data-service": [allReadGateways.local],
  "mock-data-service-tests": [allReadGateways.unit_tests],
};

export const resolveDataServiceUrls = (
  dataServiceId: string,
  opts?: { historical?: boolean; metadata?: boolean }
): string[] => {
  const gateways = REDSTONE_DATA_SERVICES_URLS[dataServiceId];
  if (!gateways) {
    throw new Error(
      `Data service ${dataServiceId} is not configured by RedStone protocol`
    );
  }

  return gateways
    .filter(
      (gateway) =>
        (!opts?.historical || gateway.historical) &&
        (!opts?.metadata || gateway.metadata)
    )
    .map((gw) => gw.url);
};
