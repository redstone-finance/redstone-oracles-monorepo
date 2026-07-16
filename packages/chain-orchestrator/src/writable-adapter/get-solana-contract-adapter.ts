import {
  createSolanaConfig,
  makeKeypair,
  makeSolanaUpdater,
  SolanaClientBuilder,
  SolanaWriteContractAdapter,
} from "@redstone-finance/solana-connector";
import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { PartialRelayerConfig } from "./partial-relayer-config";
import { getRelayerRpcMetricReporter } from "./rpc-metric-reporter";

export const getSolanaContractAdapter = (relayerConfig: PartialRelayerConfig) => {
  const {
    privateKey,
    adapterContractAddress,
    networkId,
    rpcUrls,
    gasLimit,
    gasMultiplier,
    maxTxSendAttempts,
    expectedTxDeliveryTimeInMS,
    percentileOfPriorityFee,
  } = relayerConfig;

  const solanaConfig = createSolanaConfig({
    gasLimit,
    gasMultiplier,
    maxTxSendAttempts,
    expectedTxDeliveryTimeMs: expectedTxDeliveryTimeInMS,
    percentileOfPriorityFee: Array.isArray(percentileOfPriorityFee)
      ? percentileOfPriorityFee.at(0)
      : percentileOfPriorityFee,
    useAggressiveGasOracle: RedstoneCommon.getFromEnv(
      "SOLANA_USE_AGGRESSIVE_GAS_ORACLE",
      z.boolean().default(true)
    ),
    canSendViaJito: RedstoneCommon.getFromEnv(
      "SOLANA_CAN_SEND_VIA_JITO",
      z.boolean().default(false)
    ),
  });
  const keypair = makeKeypair(privateKey);
  const { client, jito } = new SolanaClientBuilder()
    .withNetworkId(networkId)
    .withRpcUrls(rpcUrls)
    .withQuarantineEnabled()
    .withTelemetry(getRelayerRpcMetricReporter(relayerConfig))
    .withRedStoneConnection()
    .buildWithJito();
  const updater = makeSolanaUpdater(
    { client, jito },
    adapterContractAddress,
    keypair,
    solanaConfig
  );

  return new SolanaWriteContractAdapter(client, updater);
};
