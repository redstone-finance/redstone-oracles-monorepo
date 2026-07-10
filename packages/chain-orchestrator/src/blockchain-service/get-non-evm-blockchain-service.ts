import {
  CantonBlockchainService,
  CantonBlockchainServiceWithTransfer,
  CantonClientBuilder,
  chainIdToNetwork,
  getCantonNodeConfig,
} from "@redstone-finance/canton-connector";
import { MoveBlockchainService, MoveClientBuilder } from "@redstone-finance/move-connector";
import { BlockchainServiceWithTxLookup } from "@redstone-finance/multichain-kit";
import { SolanaConnectionBuilder } from "@redstone-finance/solana-connection";
import {
  makeKeypair as makeSolanaKeypair,
  SolanaBlockchainService,
  SolanaBlockchainServiceWithTransfer,
  SolanaClient,
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
  deconstructNetworkId,
  NetworkId,
  RedstoneCommon,
} from "@redstone-finance/utils";
import { getCantonAuth } from "../utils";

export async function getNonEvmBlockchainService(
  networkId: NetworkId,
  rpcUrls: string[]
): Promise<BlockchainServiceWithTxLookup> {
  const { chainType } = deconstructNetworkId(networkId);
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
      const connection = new SolanaConnectionBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .withRedStoneConnection()
        .build();

      return new SolanaBlockchainService(new SolanaClient(connection));
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
      const chainId = deconstructNetworkId(networkId).chainId;
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
    case ChainTypeEnum.enum.evm:
      throw new Error(
        `Evm networkId ${networkId} got passed to non-evm blockchain service builder.`
      );
    default:
      return RedstoneCommon.throwUnsupportedParamError(chainType);
  }
}

export async function getNonEvmBlockchainServiceWithTransfer(
  networkId: NetworkId,
  rpcUrls: string[],
  privateKey: RedstoneCommon.PrivateKey
) {
  const { chainType } = deconstructNetworkId(networkId);
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
      const connection = new SolanaConnectionBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .build();
      const keypair = makeSolanaKeypair(privateKey.value);

      return new SolanaBlockchainServiceWithTransfer(new SolanaClient(connection), keypair);
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
      const { chainId } = deconstructNetworkId(networkId);
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
      throw new Error(`Not supported for ${chainType}`);
    case ChainTypeEnum.enum.evm:
      throw new Error(
        `Evm networkId ${networkId} got passed to non-evm blockchain service builder.`
      );
    default:
      return RedstoneCommon.throwUnsupportedParamError(chainType);
  }
}
