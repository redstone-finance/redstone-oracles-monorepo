import {
  CantonBlockchainService,
  CantonBlockchainServiceWithTransfer,
  CantonClientBuilder,
  chainIdToNetwork,
  getCantonNodeConfig,
} from "@redstone-finance/canton-connector";
import { MoveBlockchainService, MoveClientBuilder } from "@redstone-finance/move-connector";
import { BlockchainServiceWithTxLookup } from "@redstone-finance/multichain-kit";
import {
  makeKeypair as makeSolanaKeypair,
  SolanaBlockchainService,
  SolanaBlockchainServiceWithTransfer,
  SolanaClientBuilder,
} from "@redstone-finance/solana-connector";
import {
  makeKeypair as makeStellarKeypair,
  StellarBlockchainService,
  StellarBlockchainServiceWithTransfer,
  StellarClientBuilder,
} from "@redstone-finance/stellar-connector";
import {
  makeSuiKeypair,
  SuiBlockchainService,
  SuiBlockchainServiceWithTransfer,
  SuiClientBuilder,
} from "@redstone-finance/sui-connector";
import {
  ChainTypeEnum,
  deconstructNonEvmNetworkId,
  NonEvmNetworkId,
  RedstoneCommon,
} from "@redstone-finance/utils";
import { getCantonAuth } from "../utils";

export async function getNonEvmBlockchainService(
  networkId: NonEvmNetworkId,
  rpcUrls: string[]
): Promise<BlockchainServiceWithTxLookup> {
  const { chainType } = deconstructNonEvmNetworkId(networkId);
  switch (chainType) {
    case ChainTypeEnum.enum.sui: {
      const suiClient = new SuiClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .build();

      return new SuiBlockchainService(suiClient);
    }
    case ChainTypeEnum.enum.aptos:
    case ChainTypeEnum.enum.movement: {
      const moveClient = MoveClientBuilder.getInstance(chainType)
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .build();

      return MoveBlockchainService.getInstance(chainType, moveClient);
    }
    case ChainTypeEnum.enum.solana: {
      const client = new SolanaClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .withRedStoneConnection()
        .build();

      return new SolanaBlockchainService(client);
    }
    case ChainTypeEnum.enum.stellar: {
      const client = new StellarClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .withMulticall()
        .build();

      return new StellarBlockchainService(client);
    }
    case ChainTypeEnum.enum.canton: {
      const chainId = deconstructNonEvmNetworkId(networkId).chainId;
      const auth = await getCantonAuth(chainId);
      const client = new CantonClientBuilder()
        .withRpcUrls(rpcUrls)
        .withNetworkId(networkId)
        .withDefaultAuth(auth)
        .build();

      return new CantonBlockchainService(client);
    }
    case ChainTypeEnum.enum.fuel:
    case ChainTypeEnum.enum.radix:
      throw new Error(`getNonEvmBlockchainService is not supported for ${chainType}`);
    default:
      return RedstoneCommon.throwUnsupportedParamError(chainType);
  }
}

export async function getNonEvmBlockchainServiceWithTransfer(
  networkId: NonEvmNetworkId,
  rpcUrls: string[],
  privateKey: RedstoneCommon.PrivateKey
) {
  const { chainType } = deconstructNonEvmNetworkId(networkId);
  switch (chainType) {
    case ChainTypeEnum.enum.sui: {
      const suiClient = new SuiClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .build();
      const keypair = makeSuiKeypair(privateKey.value);

      return new SuiBlockchainServiceWithTransfer(suiClient, keypair);
    }
    case ChainTypeEnum.enum.aptos:
    case ChainTypeEnum.enum.movement: {
      const moveClient = MoveClientBuilder.getInstance(chainType)
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .build();

      return MoveBlockchainService.getInstance(chainType, moveClient, privateKey);
    }
    case ChainTypeEnum.enum.solana: {
      const client = new SolanaClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .build();
      const keypair = makeSolanaKeypair(privateKey.value);

      return new SolanaBlockchainServiceWithTransfer(client, keypair);
    }
    case ChainTypeEnum.enum.stellar: {
      const client = new StellarClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .withMulticall()
        .build();
      const keypair = makeStellarKeypair(privateKey.value);

      return new StellarBlockchainServiceWithTransfer(client, keypair);
    }
    case ChainTypeEnum.enum.canton: {
      const { chainId } = deconstructNonEvmNetworkId(networkId);
      const network = chainIdToNetwork(chainId);
      const auth = await getCantonAuth(chainId);
      if (!auth) {
        throw new Error(`Canton auth not configured for chain ${chainId}`);
      }

      const { zrodelkoPartyId } = getCantonNodeConfig(network);
      const client = new CantonClientBuilder()
        .withRpcUrls(rpcUrls)
        .withNetworkId(networkId)
        .withDefaultAuth(auth)
        .withTransferService()
        .build();

      return new CantonBlockchainServiceWithTransfer(client, {
        partyId: zrodelkoPartyId,
        privateKeyHex: privateKey.value,
      });
    }
    case ChainTypeEnum.enum.fuel:
    case ChainTypeEnum.enum.radix:
      throw new Error(`getNonEvmBlockchainServiceWithTransfer is not supported for ${chainType}`);
    default:
      return RedstoneCommon.throwUnsupportedParamError(chainType);
  }
}
