import {
  AptosClientBuilder,
  MovementClientBuilder,
} from "@redstone-finance/move-connector";
import { RadixClientBuilder } from "@redstone-finance/radix-connector";
import {
  makeKeypair as makeSolanaKeypair,
  SolanaConnectionBuilder,
} from "@redstone-finance/solana-connector";
import {
  makeSuiKeypair,
  SuiClientBuilder,
} from "@redstone-finance/sui-connector";
import {
  deconstructNetworkId,
  NetworkId,
  RedstoneCommon,
} from "@redstone-finance/utils";
import { MoveBlockchainService } from "./MoveBlockchainService";
import { RadixBlockchainService } from "./RadixBlockchainService";
import { SolanaBlockchainService } from "./SolanaBlockchainService";
import { SuiBlockchainService } from "./SuiBlockchainService";

export function getNonEvmBlockchainService(
  networkId: NetworkId,
  rpcUrls: string[],
  privateKey?: RedstoneCommon.PrivateKey
) {
  const { chainType } = deconstructNetworkId(networkId);
  switch (chainType) {
    case "sui": {
      const suiClient = new SuiClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .build();
      const keypair = privateKey ? makeSuiKeypair(privateKey.value) : undefined;
      return new SuiBlockchainService(suiClient, keypair);
    }
    case "movement": {
      const movementClient = new MovementClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .build();
      return new MoveBlockchainService(movementClient, privateKey);
    }
    case "aptos": {
      const aptosClient = new AptosClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .build();
      return new MoveBlockchainService(aptosClient, privateKey);
    }
    case "radix": {
      const radixClient = new RadixClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .withPrivateKey(privateKey)
        .build();
      return new RadixBlockchainService(radixClient);
    }
    case "solana": {
      const connection = new SolanaConnectionBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .build();
      const keypair = privateKey
        ? makeSolanaKeypair(privateKey.value)
        : undefined;
      return new SolanaBlockchainService(connection, undefined, keypair);
    }
    case "stellar":
    case "fuel":
      throw new Error(`Not supported for ${chainType}`);
    case "evm":
      throw new Error(
        `Evm networkId ${networkId} got passed to non-evm blockchain service builder.`
      );
    default:
      return RedstoneCommon.throwUnsupportedParamError(chainType);
  }
}
