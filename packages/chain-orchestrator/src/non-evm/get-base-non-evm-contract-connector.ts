import {
  deconstructNetworkId,
  NetworkId,
} from "@redstone-finance/chain-configs";
import {
  AptosClientBuilder,
  MovementContractConnector,
} from "@redstone-finance/movement-connector";
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
import { RedstoneCommon } from "@redstone-finance/utils";

export function getBaseNonEvmContractConnector(
  networkId: NetworkId,
  rpcUrls: string[]
) {
  const { chainId, chainType } = deconstructNetworkId(networkId);
  switch (chainType) {
    case "sui":
      return new SuiContractConnector(
        new SuiClientBuilder().withChainId(chainId).withRpcUrls(rpcUrls).build()
      );
    case "movement":
      return new MovementContractConnector(
        new AptosClientBuilder()
          .withChainId(chainId)
          .withRpcUrls(rpcUrls)
          .build()
      );
    case "radix":
      return new RadixContractConnector(
        new RadixClientBuilder()
          .withNetworkId(chainId)
          .withRpcUrls(rpcUrls)
          .build()
      );
    case "solana":
      return new SolanaContractConnector(
        new SolanaConnectionBuilder()
          .withChainId(chainId)
          .withRpcUrls(rpcUrls)
          .build()
      );
    case "fuel":
      throw new Error(`Not supported for ${chainType}`);
    case "evm":
      throw new Error(
        `Evm networkId ${networkId} got passed to non-evm contract connector builder.`
      );
    default:
      return RedstoneCommon.throwUnsupportedParamError(chainType);
  }
}
