import {
  CANTON_CONTRACT_ADAPTER_DEFAULT_CONFIG,
  CantonClientBuilder,
  PricesCantonReadOnlyAdapter,
  readCantonPartyIds,
} from "@redstone-finance/canton-connector";
import { MoveClientBuilder, MovePricesContractAdapter } from "@redstone-finance/move-connector";
import { AnyOnChainRelayerManifest } from "@redstone-finance/on-chain-relayer-common";
import { SolanaConnectionBuilder } from "@redstone-finance/solana-connection";
import { SolanaContractAdapter } from "@redstone-finance/solana-connector";
import {
  Sep40StellarContractAdapter,
  StellarClientBuilder,
  StellarContractAdapter,
} from "@redstone-finance/stellar-connector";
import {
  makeSuiConfig,
  SuiClientBuilder,
  SuiContractAdapter,
} from "@redstone-finance/sui-connector";
import { ChainTypeEnum, deconstructNetworkId, RedstoneCommon } from "@redstone-finance/utils";
import { getCantonAuth } from "../utils";

export async function getNonEvmMonitoringContractAdapter(
  relayerManifest: AnyOnChainRelayerManifest,
  rpcUrls: string[],
  withRounds?: boolean
) {
  const { chainType } = deconstructNetworkId(relayerManifest.chain.id);

  switch (chainType) {
    case ChainTypeEnum.enum.sui:
      return getSuiContractAdapter(rpcUrls, relayerManifest);
    case ChainTypeEnum.enum.aptos:
    case ChainTypeEnum.enum.movement:
      return getMoveContractAdapter(rpcUrls, relayerManifest, chainType);
    case ChainTypeEnum.enum.solana:
      return getSolanaContractAdapter(rpcUrls, relayerManifest);
    case ChainTypeEnum.enum.stellar:
      return getStellarContractAdapter(rpcUrls, relayerManifest, withRounds);
    case ChainTypeEnum.enum.canton:
      return await getCantonContractAdapter(rpcUrls, relayerManifest);
    case ChainTypeEnum.enum.fuel:
    case ChainTypeEnum.enum.radix:
    case ChainTypeEnum.enum.evm:
      throw new Error(
        `Evm relayer config with networkId: ${relayerManifest.chain.id} got passed to non-evm blockchain service builder.`
      );
    default:
      return RedstoneCommon.throwUnsupportedParamError(chainType);
  }
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

  const suiClient = new SuiClientBuilder()
    .withNetworkId(relayerManifest.chain.id)
    .withRpcUrls(rpcUrls)
    .build();

  const config = makeSuiConfig({
    packageId: relayerManifest.adapterContractPackageId,
    priceAdapterObjectId: relayerManifest.adapterContract,
  });

  return new SuiContractAdapter(suiClient, config);
}

function getMoveContractAdapter(
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

  return MovePricesContractAdapter.create(aptosClient, {
    packageObjectAddress: relayerManifest.adapterContractPackageId,
    priceAdapterObjectAddress: relayerManifest.adapterContract,
  });
}

function getStellarContractAdapter(
  rpcUrls: string[],
  relayerManifest: AnyOnChainRelayerManifest,
  withRounds?: boolean
) {
  const client = new StellarClientBuilder()
    .withNetworkId(relayerManifest.chain.id)
    .withRpcUrls(rpcUrls)
    .withMulticall()
    .build();

  return new (withRounds ? Sep40StellarContractAdapter : StellarContractAdapter)(
    client,
    relayerManifest.adapterContract
  );
}

async function getCantonContractAdapter(
  rpcUrls: string[],
  relayerManifest: AnyOnChainRelayerManifest
) {
  const chainId = deconstructNetworkId(relayerManifest.chain.id).chainId;
  const auth = await getCantonAuth(chainId);
  const client = new CantonClientBuilder()
    .withNetworkId(relayerManifest.chain.id)
    .withRpcUrls(rpcUrls)
    .withDefaultAuth(auth)
    .build();

  const { viewerPartyId } = readCantonPartyIds();

  return new PricesCantonReadOnlyAdapter(
    client,
    {
      ...CANTON_CONTRACT_ADAPTER_DEFAULT_CONFIG,
      viewerPartyId,
      adapterId: relayerManifest.adapterContract,
    },
    relayerManifest.adapterContractPackageId
  );
}
