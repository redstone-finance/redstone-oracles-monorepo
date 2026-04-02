import { MoveClientBuilder, MovePricesContractConnector } from "@redstone-finance/move-connector";
import { ForwardCompatibleContractAdapter } from "@redstone-finance/multichain-kit";
import { AnyOnChainRelayerManifest } from "@redstone-finance/on-chain-relayer-common";
import {
  PriceAdapterRadixContractConnector,
  RadixClientBuilder,
} from "@redstone-finance/radix-connector";
import { SolanaConnectionBuilder, SolanaContractAdapter } from "@redstone-finance/solana-connector";
import { StellarClientBuilder, StellarContractAdapter } from "@redstone-finance/stellar-connector";
import {
  makeSuiConfig,
  SuiClientBuilders,
  SuiContractAdapter,
} from "@redstone-finance/sui-connector";
import { deconstructNetworkId, RedstoneCommon } from "@redstone-finance/utils";

export async function getNonEvmMonitoringContractAdapter(
  relayerManifest: AnyOnChainRelayerManifest,
  rpcUrls: string[]
) {
  const { chainType } = deconstructNetworkId(relayerManifest.chain.id);

  switch (chainType) {
    case "radix":
      return await getRadixContractAdapter(rpcUrls, relayerManifest);
    case "sui":
      return getSuiContractAdapter(rpcUrls, relayerManifest);
    case "aptos":
    case "movement":
      return await getMoveContractAdapter(rpcUrls, relayerManifest, chainType);
    case "solana":
      return getSolanaContractAdapter(rpcUrls, relayerManifest);
    case "stellar":
      return getStellarContractAdapter(rpcUrls, relayerManifest);
    case "fuel":
    case "canton":
      throw new Error(`${chainType} is not supported in monitoring`);
    case "evm":
      throw new Error(
        `Evm relayer config with networkId: ${relayerManifest.chain.id} got passed to non-evm blockchain service builder.`
      );
    default:
      return RedstoneCommon.throwUnsupportedParamError(chainType);
  }
}

async function getRadixContractAdapter(
  rpcUrls: string[],
  relayerManifest: AnyOnChainRelayerManifest
) {
  const client = new RadixClientBuilder()
    .withNetworkId(relayerManifest.chain.id)
    .withRpcUrls(rpcUrls)
    .build();

  const connector = new PriceAdapterRadixContractConnector(client, relayerManifest.adapterContract);

  return await ForwardCompatibleContractAdapter.fromConnector(connector);
}

function getSolanaContractAdapter(rpcUrls: string[], relayerManifest: AnyOnChainRelayerManifest) {
  const connection = new SolanaConnectionBuilder()
    .withNetworkId(relayerManifest.chain.id)
    .withRpcUrls(rpcUrls)
    .withRedStoneConnection()
    .build();

  return SolanaContractAdapter.fromConnectionAndAddress(
    connection,
    relayerManifest.adapterContract
  );
}

function getSuiContractAdapter(rpcUrls: string[], relayerManifest: AnyOnChainRelayerManifest) {
  if (!relayerManifest.adapterContractPackageId) {
    throw new Error("adapterContractPackageId is required");
  }

  const suiClient = SuiClientBuilders.legacyClientBuilder()
    .withNetworkId(relayerManifest.chain.id)
    .withRpcUrls(rpcUrls)
    .build();

  const config = makeSuiConfig({
    packageId: relayerManifest.adapterContractPackageId,
    priceAdapterObjectId: relayerManifest.adapterContract,
  });

  return new SuiContractAdapter(suiClient, config);
}

async function getMoveContractAdapter(
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

  const connector = new MovePricesContractConnector(aptosClient, {
    packageObjectAddress: relayerManifest.adapterContractPackageId,
    priceAdapterObjectAddress: relayerManifest.adapterContract,
  });

  return await ForwardCompatibleContractAdapter.fromConnector(connector);
}

function getStellarContractAdapter(rpcUrls: string[], relayerManifest: AnyOnChainRelayerManifest) {
  const client = new StellarClientBuilder()
    .withNetworkId(relayerManifest.chain.id)
    .withRpcUrls(rpcUrls)
    .build();

  return new StellarContractAdapter(client, relayerManifest.adapterContract);
}
