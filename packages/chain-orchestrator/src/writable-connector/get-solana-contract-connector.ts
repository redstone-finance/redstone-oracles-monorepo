import { BackwardCompatibleConnector } from "@redstone-finance/multichain-kit";
import {
  createSolanaConfig,
  makeKeypair,
  SolanaConnectionBuilder,
  SolanaContractConnector,
} from "@redstone-finance/solana-connector";
import { PartialRelayerConfig } from "./partial-relayer-config";

export const getSolanaContractConnector = (relayerConfig: PartialRelayerConfig) => {
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
    .build();

  const fullConnector = new SolanaContractConnector(
    connection,
    adapterContractAddress,
    keypair,
    solanaConfig
  );

  return new BackwardCompatibleConnector(fullConnector);
};
