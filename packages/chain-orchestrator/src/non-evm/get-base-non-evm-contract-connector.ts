import {
  AptosClientBuilder,
  MovementContractConnector,
} from "@redstone-finance/movement-connector";
import {
  FUEL,
  MOVEMENT_MULTI_FEED,
  NonEvmAdapterType,
  RADIX_MULTI_FEED,
  SOLANA_MULTI_FEED,
  SUI_MULTI_FEED,
} from "@redstone-finance/on-chain-relayer-common";
import {
  RadixClientBuilder,
  RadixContractConnector,
} from "@redstone-finance/radix-connector";
import {
  SolanaConnectionBuilder,
  SolanaContractConnector,
} from "@redstone-finance/solana-connector";
import {
  SuiClientBuilder,
  SuiContractConnector,
} from "@redstone-finance/sui-connector";

export function getBaseNonEvmContractConnector(
  adapterType: NonEvmAdapterType,
  chainId: number,
  rpcUrls: string[]
) {
  switch (adapterType) {
    case SUI_MULTI_FEED:
      return new SuiContractConnector(
        new SuiClientBuilder().withChainId(chainId).withRpcUrls(rpcUrls).build()
      );
    case MOVEMENT_MULTI_FEED:
      return new MovementContractConnector(
        new AptosClientBuilder()
          .withChainId(chainId)
          .withRpcUrls(rpcUrls)
          .build()
      );
    case RADIX_MULTI_FEED:
      return new RadixContractConnector(
        new RadixClientBuilder()
          .withNetworkId(chainId)
          .withRpcUrls(rpcUrls)
          .build()
      );
    case SOLANA_MULTI_FEED:
      return new SolanaContractConnector(
        new SolanaConnectionBuilder()
          .withChainId(chainId)
          .withRpcUrls(rpcUrls)
          .build()
      );
    case FUEL:
      throw new Error(`Not supported for ${adapterType}`);
  }
}
