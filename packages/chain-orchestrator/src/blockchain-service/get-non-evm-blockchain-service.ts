import { NonEvmChainType } from "@redstone-finance/chain-configs";
import { AptosClientBuilder } from "@redstone-finance/movement-connector";
import { RadixClientBuilder } from "@redstone-finance/radix-connector";
import { SuiClientBuilder } from "@redstone-finance/sui-connector";
import { MovementBlockchainService } from "./MovementBlockchainService";
import { RadixBlockchainService } from "./RadixBlockchainService";
import { SuiBlockchainService } from "./SuiBlockchainService";

export function getNonEvmBlockchainService(
  rpcUrls: string[],
  chainType: NonEvmChainType,
  chainId: number
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
        .build();
      return new RadixBlockchainService(radixClient);
    }
    case "solana": {
      throw new Error("Not implemented");
    }
    case "fuel":
      throw new Error(`chain type ${chainType} not supported`);
  }
}
