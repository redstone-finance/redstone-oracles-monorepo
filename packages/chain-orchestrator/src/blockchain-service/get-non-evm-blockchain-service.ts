import { ChainType } from "@redstone-finance/chain-configs";
import { AptosClientBuilder } from "@redstone-finance/movement-connector";
import { SuiClientBuilder } from "@redstone-finance/sui-connector";
import { MovementBlockchainService } from "./MovementBlockchainService";
import { SuiBlockchainService } from "./SuiBlockchainService";

export function getNonEvmBlockchainService(
  rpcUrls: string[],
  chainType: ChainType,
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
    default:
      throw new Error(`chain type ${chainType} not supported`);
  }
}
