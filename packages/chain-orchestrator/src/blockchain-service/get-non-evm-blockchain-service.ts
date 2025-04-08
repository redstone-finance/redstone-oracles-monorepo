import { NonEvmChainType } from "@redstone-finance/chain-configs";
import { AptosClientBuilder } from "@redstone-finance/movement-connector";
import { RadixClientBuilder } from "@redstone-finance/radix-connector";
import { SolanaConnectionBuilder } from "@redstone-finance/solana-connector";
import { SuiClientBuilder } from "@redstone-finance/sui-connector";
import { RedstoneCommon } from "@redstone-finance/utils";
import { MovementBlockchainService } from "./MovementBlockchainService";
import { RadixBlockchainService } from "./RadixBlockchainService";
import { SolanaBlockchainService } from "./SolanaBlockchainService";
import { SuiBlockchainService } from "./SuiBlockchainService";

export function getNonEvmBlockchainService(
  rpcUrls: string[],
  chainType: NonEvmChainType,
  chainId: number,
  privateKey?: RedstoneCommon.PrivateKey
) {
  switch (chainType) {
    case "sui": {
      const suiClient = new SuiClientBuilder()
        .withChainId(chainId)
        .withRpcUrls(rpcUrls)
        .build();
      return new SuiBlockchainService(suiClient);
    }
    case "movement": {
      const aptosClient = new AptosClientBuilder()
        .withChainId(chainId)
        .withRpcUrls(rpcUrls)
        .build();
      return new MovementBlockchainService(aptosClient);
    }
    case "radix": {
      const radixClient = new RadixClientBuilder()
        .withNetworkId(chainId)
        .withRpcUrls(rpcUrls)
        .withPrivateKey(privateKey)
        .build();
      return new RadixBlockchainService(radixClient);
    }
    case "solana": {
      const connection = new SolanaConnectionBuilder()
        .withChainId(chainId)
        .withRpcUrls(rpcUrls)
        .build();
      return new SolanaBlockchainService(connection);
    }
    case "fuel":
      throw new Error(`chain type ${chainType} not supported`);
  }
}
