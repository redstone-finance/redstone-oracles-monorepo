import { ChainConfig, fetchParsedRpcUrlsFromSsmByNetworkId } from "@redstone-finance/chain-configs";
import { EvmBlockchainService } from "@redstone-finance/evm-adapters";
import { BlockchainService } from "@redstone-finance/multichain-kit";
import { MegaProviderBuilder } from "@redstone-finance/rpc-providers";
import { isNonEvmNetworkId } from "@redstone-finance/utils";
import { MonitoringEnv } from "../monitoring-adapter/get-monitoring-contract-adapter";
import { getNonEvmBlockchainService } from "./get-non-evm-blockchain-service";

const SINGLE_RPC_TIMEOUT_MILLISECONDS = 10_000;
const ALL_RPC_TIMEOUT_MILLISECONDS = 60_000;

export async function getBlockchainService(rpcUrls: string[], chainConfig: ChainConfig) {
  if (isNonEvmNetworkId(chainConfig.networkId)) {
    return await getNonEvmBlockchainService(chainConfig.networkId, rpcUrls);
  }

  const provider = new MegaProviderBuilder({
    timeout: SINGLE_RPC_TIMEOUT_MILLISECONDS,
    throttleLimit: 1,
    network: {
      name: `name-${chainConfig.networkId}`,
      chainId: chainConfig.networkId,
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

  return new EvmBlockchainService(provider, {
    address: chainConfig.multicall3.address,
    type: chainConfig.multicall3.type,
  });
}

export async function getMonitoringBlockchainService(
  chainConfig: ChainConfig,
  env: MonitoringEnv
): Promise<BlockchainService> {
  const rpcUrls = await fetchParsedRpcUrlsFromSsmByNetworkId(chainConfig.networkId, env);

  return await getBlockchainService(rpcUrls, chainConfig);
}
