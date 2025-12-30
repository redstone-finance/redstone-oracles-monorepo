import { fetchOrParseManifest, OnChainRelayerEnv } from "@redstone-finance/on-chain-relayer";
import { IterationArgsProviderEnv } from "../IterationArgsProviderInterface";

const NOT_NEEDED_FOR_GELATO = "Not needed for Gelato";
const NUMBER_NOT_NEEDED_FOR_GELATO = 0;

const EMPTY_GELATO_ENV: OnChainRelayerEnv = {
  relayerIterationInterval: NUMBER_NOT_NEEDED_FOR_GELATO,
  rpcUrls: [NOT_NEEDED_FOR_GELATO],
  privateKey: NOT_NEEDED_FOR_GELATO,
  gasLimit: NUMBER_NOT_NEEDED_FOR_GELATO,
  expectedTxDeliveryTimeInMS: NUMBER_NOT_NEEDED_FOR_GELATO,
  singleProviderOperationTimeout: NUMBER_NOT_NEEDED_FOR_GELATO,
  allProvidersOperationTimeout: NUMBER_NOT_NEEDED_FOR_GELATO,
  twoDimensionalFees: false,
  isNotLazy: true,
  disableCustomGasOracle: false,
  fallbackSkipDeviationBasedFrequentUpdates: false,
  temporaryUpdatePriceInterval: -1,
  fallbackOffsetInMilliseconds: 120000,
  useMulticallProvider: true,
  oevTotalTimeout: 10000,
  oevResolveAuctionTimeout: 2000,
  oevVerifyGasPriceDisabled: false,
  getBlockNumberTimeout: 1000,
  waitForAllGatewaysTimeMs: 5000,
  includeAdditionalFeedsForGasOptimization: true,
  uniqueSignerThresholdCacheTtlMs: 0,
  rewardsPerBlockAggregationAlgorithm:
    "max" as OnChainRelayerEnv["rewardsPerBlockAggregationAlgorithm"],
};

export async function fetchManifestAndSetUpEnv(env: IterationArgsProviderEnv) {
  const manifest = await fetchOrParseManifest(env.manifestUrls, env.localManifestData);

  const relayerEnv: OnChainRelayerEnv = {
    ...EMPTY_GELATO_ENV,
    ...env,
  };

  return { relayerEnv, manifest };
}
