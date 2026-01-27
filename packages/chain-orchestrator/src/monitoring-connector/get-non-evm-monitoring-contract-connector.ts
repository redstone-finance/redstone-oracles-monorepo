import { MoveClientBuilder, MovePricesContractConnector } from "@redstone-finance/move-connector";
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
  PriceAdapterStellarContractConnector,
  StellarClientBuilder,
} from "@redstone-finance/stellar-connector";
import {
  makeSuiConfig,
  SuiClientBuilder,
  SuiPricesContractConnector,
} from "@redstone-finance/sui-connector";
import { deconstructNetworkId, RedstoneCommon } from "@redstone-finance/utils";

export function getNonEvmMonitoringContractConnector(
  relayerManifest: AnyOnChainRelayerManifest,
  rpcUrls: string[]
) {
  const { chainType } = deconstructNetworkId(relayerManifest.chain.id);

  switch (chainType) {
    case "radix":
      return getRadixContractConnector(rpcUrls, relayerManifest);
    case "sui":
      return getSuiContractConnector(rpcUrls, relayerManifest);
    case "aptos":
    case "movement":
      return getMoveContractConnector(rpcUrls, relayerManifest, chainType);
    case "solana":
      return getSolanaContractConnector(rpcUrls, relayerManifest);
    case "stellar":
      return getStellarContractConnector(rpcUrls, relayerManifest);
    case "fuel":
    case "canton":
      throw new Error(`${relayerManifest.adapterContractType} is not supported in monitoring`);
    case "evm":
      throw new Error(
        `Evm relayer config with networkId: ${relayerManifest.chain.id} got passed to non-evm blockchain service builder.`
      );
    default:
      return RedstoneCommon.throwUnsupportedParamError(chainType);
  }
}

function getRadixContractConnector(rpcUrls: string[], relayerManifest: AnyOnChainRelayerManifest) {
  const client = new RadixClientBuilder()
    .withNetworkId(relayerManifest.chain.id)
    .withRpcUrls(rpcUrls)
    .build();

  return new PriceAdapterRadixContractConnector(client, relayerManifest.adapterContract);
}

function getSolanaContractConnector(rpcUrls: string[], relayerManifest: AnyOnChainRelayerManifest) {
  const connection = new SolanaConnectionBuilder()
    .withNetworkId(relayerManifest.chain.id)
    .withRpcUrls(rpcUrls)
    .build();

  return new SolanaContractConnector(connection, relayerManifest.adapterContract);
}

function getSuiContractConnector(rpcUrls: string[], relayerManifest: AnyOnChainRelayerManifest) {
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

function getMoveContractConnector(
  rpcUrls: string[],
  relayerManifest: AnyOnChainRelayerManifest,
  adapterType: "aptos" | "movement"
) {
  if (!relayerManifest.adapterContractPackageId) {
    throw new Error("adapterContractPackageId is required");
  }
  const aptosClient = MoveClientBuilder.getInstance(adapterType)
    .withNetworkId(relayerManifest.chain.id)
    .withRpcUrls(rpcUrls)
    .build();

  return new MovePricesContractConnector(aptosClient, {
    packageObjectAddress: relayerManifest.adapterContractPackageId,
    priceAdapterObjectAddress: relayerManifest.adapterContract,
  });
}

function getStellarContractConnector(
  rpcUrls: string[],
  relayerManifest: AnyOnChainRelayerManifest
) {
  const client = new StellarClientBuilder()
    .withNetworkId(relayerManifest.chain.id)
    .withRpcUrls(rpcUrls)
    .build();

  return new PriceAdapterStellarContractConnector(client, relayerManifest.adapterContract);
}
