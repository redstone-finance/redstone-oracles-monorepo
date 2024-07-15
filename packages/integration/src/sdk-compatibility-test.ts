import {
  configureCleanup,
  debug,
  GatewayInstance,
  getCacheServiceUrl,
  OracleNodeInstance,
  runWithLogPrefix,
  setMockPricesMany,
  startAndWaitForGateway,
  startAndWaitForOracleNode,
  stopGateway,
  stopOracleNode,
  waitForDataAndDisplayIt as waitForDataInMongoDb,
} from "./framework/integration-test-framework";

const gatewayInstance: GatewayInstance = { instanceId: "1" };
const oracleNodeInstance1: OracleNodeInstance = { instanceId: "1" };
const oracleNodeInstance2: OracleNodeInstance = { instanceId: "2" };
const oracleNodeInstance3: OracleNodeInstance = { instanceId: "3" };
const allOracleNodeInstances = [
  oracleNodeInstance1,
  oracleNodeInstance2,
  oracleNodeInstance3,
];

const stopAll = () => {
  debug("stopAll called");
  allOracleNodeInstances.map(stopOracleNode);
  stopGateway(gatewayInstance);
};

const CACHE_TTL = 100_000;
const SDK_TEST_APP_DIR = "./sdk-test-app";

const main = async () => {
  setMockPricesMany({ BTC: 42, ETH: 43, AAVE: 44 }, allOracleNodeInstances);
  await startAndWaitForGateway(gatewayInstance, {
    dataPackagesTtl: CACHE_TTL,
    enableHistoricalDataServing: false,
    directOnly: true,
  });
  await Promise.all(
    allOracleNodeInstances.map((instance, index) =>
      startAndWaitForOracleNode(
        instance,
        [gatewayInstance],
        "single-source/mock",
        index
      )
    )
  );
  await waitForDataInMongoDb(gatewayInstance, 3);

  const gatewayUrl = getCacheServiceUrl(gatewayInstance, "any");
  const expectedPrices = {
    BTC: 42,
    ETH: 43,
    AAVE: 44,
  };
  await runWithLogPrefix("yarn", ["start"], "evm-connector", SDK_TEST_APP_DIR, {
    CACHE_SERVICE_URLS: JSON.stringify([gatewayUrl]),
    PRICES_TO_CHECK: JSON.stringify(expectedPrices),
  });

  process.exit();
};

configureCleanup(stopAll);

void main();
