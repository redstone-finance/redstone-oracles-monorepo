import {
  CantonBlockchainService,
  CantonBlockchainServiceWithTransfer,
  CantonClientBuilder,
  CantonValidatorClient,
  chainIdToNetwork,
  getCantonNodeConfig,
} from "@redstone-finance/canton-connector";
import { MoveClientBuilder } from "@redstone-finance/move-connector";
import { RadixClientBuilder } from "@redstone-finance/radix-connector";
import {
  makeKeypair as makeSolanaKeypair,
  SolanaBlockchainServiceWithTransfer,
  SolanaClient,
  SolanaConnectionBuilder,
} from "@redstone-finance/solana-connector";
import {
  makeKeypair as makeStellarKeypair,
  StellarBlockchainServiceWithTransfer,
  StellarClientBuilder,
} from "@redstone-finance/stellar-connector";
import {
  makeSuiKeypair,
  SuiBlockchainService,
  SuiBlockchainServiceWithTransfer,
  SuiClientBuilders,
} from "@redstone-finance/sui-connector";
import { deconstructNetworkId, NetworkId, RedstoneCommon } from "@redstone-finance/utils";
import { getCantonAuth } from "../utils";
import { MoveBlockchainService } from "./MoveBlockchainService";
import { RadixBlockchainService } from "./RadixBlockchainService";
import { SolanaBlockchainService } from "./SolanaBlockchainService";
import { StellarBlockchainService } from "./StellarBlockchainService";
export { CantonBlockchainService } from "@redstone-finance/canton-connector";
export { SuiBlockchainService } from "@redstone-finance/sui-connector";

export async function getNonEvmBlockchainService(networkId: NetworkId, rpcUrls: string[]) {
  const { chainType } = deconstructNetworkId(networkId);
  switch (chainType) {
    case "sui": {
      const suiClient = SuiClientBuilders.legacyClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .build();

      return new SuiBlockchainService(suiClient);
    }
    case "movement":
    case "aptos": {
      const moveClient = MoveClientBuilder.getInstance(chainType)
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .build();

      return new MoveBlockchainService(moveClient, undefined);
    }
    case "radix": {
      const radixClient = new RadixClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .withPrivateKey(undefined)
        .build();

      return new RadixBlockchainService(radixClient);
    }
    case "solana": {
      const connection = new SolanaConnectionBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .build();

      return new SolanaBlockchainService(connection);
    }
    case "stellar": {
      const client = new StellarClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .withMulticall()
        .build();

      return new StellarBlockchainService(client);
    }
    case "canton": {
      const chainId = deconstructNetworkId(networkId).chainId;

      const auth = await getCantonAuth(chainId);

      const client = new CantonClientBuilder()
        .withRpcUrls(rpcUrls)
        .withNetworkId(networkId)
        .withDefaultAuth(auth)
        .build();

      return new CantonBlockchainService(client);
    }
    case "fuel":
    case "evm":
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
    case "sui": {
      const suiClient = SuiClientBuilders.legacyClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .build();
      const keypair = makeSuiKeypair(privateKey.value);

      return new SuiBlockchainServiceWithTransfer(suiClient, keypair);
    }
    case "movement":
    case "aptos": {
      const moveClient = MoveClientBuilder.getInstance(chainType)
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .build();

      return new MoveBlockchainService(moveClient, privateKey);
    }
    case "radix": {
      const radixClient = new RadixClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .withPrivateKey(privateKey)
        .build();

      return new RadixBlockchainService(radixClient);
    }
    case "solana": {
      const connection = new SolanaConnectionBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .build();
      const keypair = makeSolanaKeypair(privateKey.value);

      return new SolanaBlockchainServiceWithTransfer(new SolanaClient(connection), keypair);
    }
    case "stellar": {
      const client = new StellarClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .withMulticall()
        .build();
      const keypair = makeStellarKeypair(privateKey.value);

      return new StellarBlockchainServiceWithTransfer(client, keypair);
    }
    case "canton": {
      const { chainId } = deconstructNetworkId(networkId);
      const network = chainIdToNetwork(chainId);
      const auth = await getCantonAuth(chainId);
      if (!auth) {
        throw new Error(`Canton auth not configured for chain ${chainId}`);
      }
      const { validatorApiUrl, zrodelkoPartyId } = getCantonNodeConfig(network);
      const client = new CantonClientBuilder()
        .withRpcUrls(rpcUrls)
        .withNetworkId(networkId)
        .withDefaultAuth(auth)
        .build();
      const validatorClient = new CantonValidatorClient(validatorApiUrl, () =>
        Promise.resolve(auth)
      );
      return new CantonBlockchainServiceWithTransfer(
        client,
        validatorClient,
        zrodelkoPartyId,
        privateKey.value
      );
    }
    case "fuel":
      throw new Error(`Not supported for ${chainType}`);
    case "evm":
      throw new Error(
        `Evm networkId ${networkId} got passed to non-evm blockchain service builder.`
      );
    default:
      return RedstoneCommon.throwUnsupportedParamError(chainType);
  }
}
