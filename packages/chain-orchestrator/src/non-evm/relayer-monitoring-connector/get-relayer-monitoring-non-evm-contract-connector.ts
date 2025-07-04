import {
  AptosClientBuilder,
  MovementPricesContractConnector,
} from "@redstone-finance/movement-connector";
import { AnyOnChainRelayerManifest } from "@redstone-finance/on-chain-relayer-common";
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
import { deconstructNetworkId, RedstoneCommon } from "@redstone-finance/utils";

export function getRelayerMonitoringNonEvmContractConnector(
  relayerManifest: AnyOnChainRelayerManifest,
  rpcUrls: string[]
) {
  const { chainType } = deconstructNetworkId(relayerManifest.chain.id);

  switch (chainType) {
    case "radix":
      return getRadixContractConnector(rpcUrls, relayerManifest);
    case "sui":
      return getSuiContractConnector(rpcUrls, relayerManifest);
    case "movement":
      return getMovementContractConnector(rpcUrls, relayerManifest);
    case "solana":
      return getSolanaContractConnector(rpcUrls, relayerManifest);
    case "fuel":
      throw new Error(
        `${relayerManifest.adapterContractType} is not supported in monitoring`
      );
    case "evm":
      throw new Error(
        `Evm relayer config with networkId: ${relayerManifest.chain.id} got passed to non-evm blockchain service builder.`
      );
    default:
      return RedstoneCommon.throwUnsupportedParamError(chainType);
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
    .withNetworkId(relayerManifest.chain.id)
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
    .withNetworkId(relayerManifest.chain.id)
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
    .withNetworkId(relayerManifest.chain.id)
    .withRpcUrls(rpcUrls)
    .build();

  return new MovementPricesContractConnector(aptosClient, {
    packageObjectAddress: relayerManifest.adapterContractPackageId,
    priceAdapterObjectAddress: relayerManifest.adapterContract,
  });
}
