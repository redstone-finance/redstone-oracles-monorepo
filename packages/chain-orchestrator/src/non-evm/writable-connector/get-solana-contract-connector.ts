import {
  SolanaConnectionBuilder,
  SolanaContractConnector,
  makeKeypair,
} from "@redstone-finance/solana-connector";
import { PartialRelayerConfig } from "./partial-relayer-config";

export const getSolanaContractConnector = (
  relayerConfig: PartialRelayerConfig
) => {
  const { privateKey, adapterContractAddress, chainName, rpcUrls } =
    relayerConfig;

  const keypair = makeKeypair(privateKey);
  const connection = new SolanaConnectionBuilder()
    .withChainName(chainName)
    .withRpcUrls(rpcUrls)
    .build();

  return new SolanaContractConnector(
    connection,
    adapterContractAddress,
    keypair
  );
};
