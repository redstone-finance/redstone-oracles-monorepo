import {
  CacheLayerInstance,
  configureCleanup,
  debug,
  deployMockAdapterAndSetInitialPrices,
  deployMockPriceFeed,
  HardhatInstance,
  OracleNodeInstance,
  RelayerInstance,
  setMockPrices,
  setMockPricesMany,
  startAndWaitForCacheLayer,
  startAndWaitForHardHat,
  startAndWaitForOracleNode,
  startRelayer,
  stopCacheLayer,
  stopHardhat,
  stopOracleNode,
  stopRelayer,
  verifyPricesOnChain,
  waitForDataAndDisplayIt,
} from "../framework/integration-test-framework";

const hardhatInstance: HardhatInstance = { instanceId: "1" };
const relayerInstance: RelayerInstance = { instanceId: "1" };
const cacheLayerInstance: CacheLayerInstance = { instanceId: "1" };
const oracleNodeInstance1: OracleNodeInstance = { instanceId: "1" };
const oracleNodeInstance2: OracleNodeInstance = { instanceId: "2" };

const stopAll = () => {
  debug("stopAll called");
  stopRelayer(relayerInstance);
  stopHardhat(hardhatInstance);
  stopOracleNode(oracleNodeInstance1);
  stopOracleNode(oracleNodeInstance2);
  stopCacheLayer(cacheLayerInstance);
};

const main = async () => {
  await startAndWaitForCacheLayer(cacheLayerInstance, { directOnly: true });
  setMockPricesMany(
    {
      BTC: 16000,
      ETH: 1500,
      __DEFAULT__: 42,
    },
    [oracleNodeInstance1, oracleNodeInstance2]
  );
  await startAndWaitForOracleNode(oracleNodeInstance1, [cacheLayerInstance]);
  await startAndWaitForOracleNode(
    oracleNodeInstance2,
    [cacheLayerInstance],
    "single-source/mock",
    1
  );
  await waitForDataAndDisplayIt(cacheLayerInstance);
  await startAndWaitForHardHat(hardhatInstance);

  const adapterContract = await deployMockAdapterAndSetInitialPrices([
    cacheLayerInstance,
  ]);
  const adapterContractAddress = adapterContract.address;
  const priceFeedContract = await deployMockPriceFeed(adapterContractAddress);

  startRelayer(relayerInstance, {
    adapterContractAddress,
    cacheServiceInstances: [cacheLayerInstance],
    isFallback: false,
    updateTriggers: {
      deviationPercentage: 0.1,
    },
  });

  await verifyPricesOnChain(adapterContract, priceFeedContract, {
    BTC: 16000,
    ETH: 1500,
    AAVE: 42,
  });

  setMockPrices(
    {
      BTC: 18000,
      ETH: 1500,
      __DEFAULT__: 42,
    },
    oracleNodeInstance1
  );

  // prices should get updated in adapter even if only single node delivers deviating prices
  await verifyPricesOnChain(adapterContract, priceFeedContract, {
    BTC: 18000,
    ETH: 1500,
    AAVE: 42,
  });

  process.exit();
};

configureCleanup(stopAll);

void main();
