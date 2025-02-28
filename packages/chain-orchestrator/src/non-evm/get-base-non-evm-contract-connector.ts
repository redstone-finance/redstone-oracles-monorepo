import {
  AptosClientBuilder,
  MovementContractConnector,
} from "@redstone-finance/movement-connector";
import {
  FUEL,
  MOVEMENT_MULTI_FEED,
  NonEvmAdapterType,
  RADIX,
  RADIX_MULTI_FEED,
  SUI_MULTI_FEED,
} from "@redstone-finance/on-chain-relayer-common";
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
    case FUEL:
    case RADIX:
    case RADIX_MULTI_FEED:
      throw new Error(`Not supported for ${adapterType}`);
  }
}
