import {
  createSolanaConfig,
  makeKeypair,
  SolanaConnectionBuilder,
  SolanaWriteContractAdapter,
} from "@redstone-finance/solana-connector";
import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { PartialRelayerConfig } from "./partial-relayer-config";

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
  });
  const keypair = makeKeypair(privateKey);
  const connection = new SolanaConnectionBuilder()
    .withNetworkId(networkId)
    .withRpcUrls(rpcUrls)
    .withQuarantineEnabled()
    .withRedStoneConnection()
    .build();

  return new SolanaWriteContractAdapter(connection, adapterContractAddress, keypair, solanaConfig);
};
