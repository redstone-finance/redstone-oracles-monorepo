import {
  CacheLayerInstance,
  configureCleanup,
  debug,
  deployMockAdapter,
  deployMockPriceFeed,
  HardhatInstance,
  OracleNodeInstance,
  RelayerInstance,
  setMockPrices,
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
  waitForRelayerIterations,
} from "../framework/integration-test-framework";

const firstHardhatInstance: HardhatInstance = { instanceId: "1" };
const secondHardhatInstance: HardhatInstance = { instanceId: "2" };
const relayerInstance: RelayerInstance = { instanceId: "1" };
const cacheLayerInstance: CacheLayerInstance = { instanceId: "1" };
const oracleNodeInstance: OracleNodeInstance = { instanceId: "1" };

const stopAll = () => {
  debug("stopAll called");
  stopRelayer(relayerInstance);
  stopHardhat(firstHardhatInstance);
  stopHardhat(secondHardhatInstance);
  stopOracleNode(oracleNodeInstance);
  stopCacheLayer(cacheLayerInstance);
};

/**
 * We start two separate hardhat instances (which are separate blockchain)
 * Deploy on them separate contracts
 * Then run ONE relayer with two working rpcs
 * Next we check if we disable one rpc, if relayer will still deliver prices
 */

const main = async () => {
  await startAndWaitForCacheLayer(cacheLayerInstance, { directOnly: true });
  setMockPrices(
    {
      BTC: 16000,
      __DEFAULT__: 42,
    },
    oracleNodeInstance
  );
  await startAndWaitForOracleNode(oracleNodeInstance, [cacheLayerInstance]);
  await waitForDataAndDisplayIt(cacheLayerInstance);

  await startAndWaitForHardHat(firstHardhatInstance);
  await startAndWaitForHardHat(secondHardhatInstance, { port: 8989 });
  const rpcUrls = [secondHardhatInstance.url!, firstHardhatInstance.url!];

  // deploy on first instance
  const adapterContract = await deployMockAdapter();
  const adapterContractAddress = adapterContract.address;
  const priceFeedContract = await deployMockPriceFeed(adapterContractAddress);

  // deploy on second instance
  await deployMockAdapter(secondHardhatInstance.url);
  await deployMockPriceFeed(adapterContractAddress, secondHardhatInstance.url);

  startRelayer(relayerInstance, {
    cacheServiceInstances: [cacheLayerInstance],
    adapterContractAddress,
    isFallback: false,
    rpcUrls,
  });
  await waitForRelayerIterations(relayerInstance, 1);
  // everything works with two RPC enabled
  await verifyPricesOnChain(adapterContract, priceFeedContract, {
    BTC: 16000,
  });

  //restart relayer with condition on value deviation 10%
  stopRelayer(relayerInstance);
  startRelayer(relayerInstance, {
    cacheServiceInstances: [cacheLayerInstance],
    adapterContractAddress,
    updateTriggers: {
      deviationPercentage: 10,
    },
    isFallback: false,
    rpcUrls,
  });

  // simulating disabling RPC
  stopHardhat(secondHardhatInstance);

  const valueWithGoodDeviation = 16000 + 16000 * 0.101;
  setMockPrices(
    {
      BTC: valueWithGoodDeviation,
      __DEFAULT__: 42 + 42 * 0.01,
    },
    oracleNodeInstance
  );
  await waitForDataAndDisplayIt(cacheLayerInstance, 2);
  await waitForRelayerIterations(relayerInstance, 1);
  await verifyPricesOnChain(adapterContract, priceFeedContract, {
    BTC: valueWithGoodDeviation,
    ETH: 42 + 42 * 0.01,
  });

  process.exit();
};

configureCleanup(stopAll);

void main();
