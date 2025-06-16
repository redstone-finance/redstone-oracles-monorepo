import {
  ChainConfig,
  isNonEvmNetworkId,
} from "@redstone-finance/chain-configs";
import { MegaProviderBuilder } from "@redstone-finance/rpc-providers";
import { EvmBlockchainService } from "./EvmBlockchainService";
import { getNonEvmBlockchainService } from "./get-non-evm-blockchain-service";

const SINGLE_RPC_TIMEOUT_MILLISECONDS = 10_000;
const ALL_RPC_TIMEOUT_MILLISECONDS = 60_000;

export function getBlockchainService(
  rpcUrls: string[],
  chainConfig: ChainConfig
) {
  if (isNonEvmNetworkId(chainConfig.networkId)) {
    return getNonEvmBlockchainService(chainConfig.networkId, rpcUrls);
  }

  const provider = new MegaProviderBuilder({
    timeout: SINGLE_RPC_TIMEOUT_MILLISECONDS,
    throttleLimit: 1,
    network: {
      name: `name-${chainConfig.chainId}`,
      chainId: chainConfig.chainId,
    },
    rpcUrls,
  })
    .fallback(
      {
        allProvidersOperationTimeout: ALL_RPC_TIMEOUT_MILLISECONDS,
        singleProviderOperationTimeout: SINGLE_RPC_TIMEOUT_MILLISECONDS,
        chainConfig,
      },
      rpcUrls.length > 1
    )
    .build();

  return new EvmBlockchainService(provider);
}
