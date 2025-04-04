import {
  SolanaConnectionBuilder,
  SolanaContractConnector,
  makeKeypair,
} from "@redstone-finance/solana-connector";
import { PartialRelayerConfig } from "./partial-relayer-config";

export const getSolanaContractConnector = (
  relayerConfig: PartialRelayerConfig
) => {
  const { privateKey, adapterContractAddress, chainId, rpcUrls } =
    relayerConfig;

  const keypair = makeKeypair(privateKey);
  const connection = new SolanaConnectionBuilder()
    .withChainId(chainId)
    .withRpcUrls(rpcUrls)
    .build();

  return new SolanaContractConnector(
    connection,
    adapterContractAddress,
    keypair
  );
};
