import {
  AptosClientBuilder,
  MovementPricesContractConnector,
} from "@redstone-finance/movement-connector";
import {
  AnyOnChainRelayerManifest,
  FUEL,
  isNonEvmConfig,
  MOVEMENT_MULTI_FEED,
  RADIX_MULTI_FEED,
  SOLANA_MULTI_FEED,
  SUI_MULTI_FEED,
} from "@redstone-finance/on-chain-relayer-common";
import {
  PriceAdapterRadixContractConnector,
  RadixClientBuilder,
} from "@redstone-finance/radix-connector";
import {
  SolanaConnectionBuilder,
  SolanaContractConnector,
} from "@redstone-finance/solana-connector";
import {
  makeSuiConfig,
  SuiClientBuilder,
  SuiPricesContractConnector,
} from "@redstone-finance/sui-connector";

export function getRelayerMonitoringNonEvmContractConnector(
  relayerManifest: AnyOnChainRelayerManifest,
  rpcUrls: string[]
) {
  if (!isNonEvmConfig(relayerManifest)) {
    throw new Error(
      `${relayerManifest.adapterContractType} is not supported for non-evm`
    );
  }

  switch (relayerManifest.adapterContractType) {
    case RADIX_MULTI_FEED:
      return getRadixContractConnector(rpcUrls, relayerManifest);
    case SUI_MULTI_FEED:
      return getSuiContractConnector(rpcUrls, relayerManifest);
    case MOVEMENT_MULTI_FEED:
      return getMovementContractConnector(rpcUrls, relayerManifest);
    case SOLANA_MULTI_FEED:
      return getSolanaContractConnector(rpcUrls, relayerManifest);
    case FUEL:
      throw new Error(
        `${relayerManifest.adapterContractType} is not supported in monitoring`
      );
  }
}

function getRadixContractConnector(
  rpcUrls: string[],
  relayerManifest: AnyOnChainRelayerManifest
) {
  const client = new RadixClientBuilder()
    .withNetworkId(relayerManifest.chain.id)
    .withRpcUrls(rpcUrls)
    .build();

  return new PriceAdapterRadixContractConnector(
    client,
    relayerManifest.adapterContract
  );
}

function getSolanaContractConnector(
  rpcUrls: string[],
  relayerManifest: AnyOnChainRelayerManifest
) {
  const connection = new SolanaConnectionBuilder()
    .withChainId(relayerManifest.chain.id)
    .withRpcUrls(rpcUrls)
    .build();

  return new SolanaContractConnector(
    connection,
    relayerManifest.adapterContract
  );
}

function getSuiContractConnector(
  rpcUrls: string[],
  relayerManifest: AnyOnChainRelayerManifest
) {
  if (!relayerManifest.adapterContractPackageId) {
    throw new Error("adapterContractPackageId is required");
  }

  const suiClient = new SuiClientBuilder()
    .withChainId(relayerManifest.chain.id)
    .withRpcUrls(rpcUrls)
    .build();

  return new SuiPricesContractConnector(
    suiClient,
    makeSuiConfig({
      packageId: relayerManifest.adapterContractPackageId,
      priceAdapterObjectId: relayerManifest.adapterContract,
    })
  );
}

function getMovementContractConnector(
  rpcUrls: string[],
  relayerManifest: AnyOnChainRelayerManifest
) {
  if (!relayerManifest.adapterContractPackageId) {
    throw new Error("adapterContractPackageId is required");
  }
  const aptosClient = new AptosClientBuilder()
    .withChainId(relayerManifest.chain.id)
    .withRpcUrls(rpcUrls)
    .build();

  return new MovementPricesContractConnector(aptosClient, {
    packageObjectAddress: relayerManifest.adapterContractPackageId,
    priceAdapterObjectAddress: relayerManifest.adapterContract,
  });
}
