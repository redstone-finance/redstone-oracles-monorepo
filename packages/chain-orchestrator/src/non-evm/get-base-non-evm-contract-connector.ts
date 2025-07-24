import {
  AptosClientBuilder,
  MoveContractConnector,
  MovementClientBuilder,
} from "@redstone-finance/move-connector";
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
import {
  deconstructNetworkId,
  NetworkId,
  RedstoneCommon,
} from "@redstone-finance/utils";

export function getBaseNonEvmContractConnector(
  networkId: NetworkId,
  rpcUrls: string[]
) {
  const { chainType } = deconstructNetworkId(networkId);
  switch (chainType) {
    case "sui":
      return new SuiContractConnector(
        new SuiClientBuilder()
          .withNetworkId(networkId)
          .withRpcUrls(rpcUrls)
          .build()
      );
    case "movement":
      return new MoveContractConnector(
        new MovementClientBuilder()
          .withNetworkId(networkId)
          .withRpcUrls(rpcUrls)
          .build()
      );
    case "aptos":
      return new MoveContractConnector(
        new AptosClientBuilder()
          .withNetworkId(networkId)
          .withRpcUrls(rpcUrls)
          .build()
      );
    case "radix":
      return new RadixContractConnector(
        new RadixClientBuilder()
          .withNetworkId(networkId)
          .withRpcUrls(rpcUrls)
          .build()
      );
    case "solana":
      return new SolanaContractConnector(
        new SolanaConnectionBuilder()
          .withNetworkId(networkId)
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
