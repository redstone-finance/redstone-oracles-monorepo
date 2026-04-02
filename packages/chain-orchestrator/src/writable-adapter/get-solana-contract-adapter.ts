import {
  createSolanaConfig,
  makeKeypair,
  SolanaConnectionBuilder,
  SolanaWriteContractAdapter,
} from "@redstone-finance/solana-connector";
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
  } = relayerConfig;

  const solanaConfig = createSolanaConfig({
    gasLimit,
    gasMultiplier,
    maxTxSendAttempts,
    expectedTxDeliveryTimeMs: expectedTxDeliveryTimeInMS,
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
