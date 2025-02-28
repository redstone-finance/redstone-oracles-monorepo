import {
  AptosClientBuilder,
  MovementPricesContractConnector,
} from "@redstone-finance/movement-connector";
import {
  AnyOnChainRelayerManifest,
  FUEL,
  isNonEvmConfig,
  MOVEMENT_MULTI_FEED,
  RADIX,
  RADIX_MULTI_FEED,
  SUI_MULTI_FEED,
} from "@redstone-finance/on-chain-relayer-common";
import {
  MultiFeedPriceAdapterRadixContractConnector,
  PriceAdapterRadixContractConnector,
  RadixClient,
} from "@redstone-finance/radix-connector";
import {
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
    case RADIX:
      return getRadixContractConnector(rpcUrls, relayerManifest);
    case RADIX_MULTI_FEED:
      return getRadixContractConnector(rpcUrls, relayerManifest, true);
    case SUI_MULTI_FEED:
      return getSuiContractConnector(rpcUrls, relayerManifest);
    case MOVEMENT_MULTI_FEED:
      return getMovementContractConnector(rpcUrls, relayerManifest);
    case FUEL:
      throw new Error(
        `${relayerManifest.adapterContractType} is not supported in monitoring`
      );
  }
}

function getRadixContractConnector(
  rpcUrls: string[],
  relayerManifest: AnyOnChainRelayerManifest,
  isMultiFeed: boolean = false
) {
  const client = new RadixClient(relayerManifest.chain.id);

  return new (
    isMultiFeed
      ? MultiFeedPriceAdapterRadixContractConnector
      : PriceAdapterRadixContractConnector
  )(client, relayerManifest.adapterContract);
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

  return new SuiPricesContractConnector(suiClient, {
    packageId: relayerManifest.adapterContractPackageId,
    priceAdapterObjectId: relayerManifest.adapterContract,
  });
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
