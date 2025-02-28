import { fetchParsedRpcUrlsFromSsmByChainId } from "@redstone-finance/chain-configs";
import { MonitoringEnv } from "@redstone-finance/monitoring-manifests";
import {
  AdapterType,
  getRpcUrlsPathComponent,
  isNonEvmAdapterType,
} from "@redstone-finance/on-chain-relayer-common";
import { BigNumber } from "ethers";
import { getProviderWithRpcUrls } from "../index";
import { getBaseNonEvmContractConnector } from "../non-evm/get-base-non-evm-contract-connector";
import { getProviderMemoized } from "./get-provider";

export type BalanceProvider = {
  getBalance: (addressOrName: string, blockTag?: number) => Promise<BigNumber>;
  getBlockNumber: () => Promise<number>;
};

const SINGLE_RPC_TIMEOUT_MILLISECONDS = 10_000;
const ALL_RPC_TIMEOUT_MILLISECONDS = 40_000;

export const getBalanceProvider = async (
  chainId: number,
  env: MonitoringEnv,
  adapterType?: AdapterType
): Promise<BalanceProvider | undefined> => {
  if (isNonEvmAdapterType(adapterType)) {
    const rpcUrls = await fetchParsedRpcUrlsFromSsmByChainId(
      getRpcUrlsPathComponent(chainId, adapterType),
      env
    );
    return await getBalanceProviderWithRpcUrls(chainId, rpcUrls, adapterType);
  } else {
    return await getProviderMemoized(chainId, env);
  }
};

export async function getBalanceProviderWithRpcUrls(
  chainId: number,
  rpcUrls: string[],
  adapterType?: AdapterType
): Promise<BalanceProvider | undefined> {
  if (!rpcUrls.length) {
    return;
  }

  if (isNonEvmAdapterType(adapterType)) {
    const connector = getBaseNonEvmContractConnector(
      adapterType,
      chainId,
      rpcUrls
    );

    return {
      getBalance: async (address) =>
        await connector.getNormalizedBalance(address).then(BigNumber.from),
      getBlockNumber: async () => await connector.getBlockNumber(),
    };
  } else {
    return await getProviderWithRpcUrls(chainId, rpcUrls, {
      singleProviderOperationTimeout: SINGLE_RPC_TIMEOUT_MILLISECONDS,
      allProvidersOperationTimeout: ALL_RPC_TIMEOUT_MILLISECONDS,
    });
  }
}
