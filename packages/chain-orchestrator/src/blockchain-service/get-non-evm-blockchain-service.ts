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
  StellarClientBuilder,
} from "@redstone-finance/stellar-connector";
import {
  makeSuiKeypair,
  SuiBlockchainServiceWithTransfer,
  SuiClientBuilder,
} from "@redstone-finance/sui-connector";
import { deconstructNetworkId, NetworkId, RedstoneCommon } from "@redstone-finance/utils";
import { MoveBlockchainService } from "./MoveBlockchainService";
import { RadixBlockchainService } from "./RadixBlockchainService";
import { SolanaBlockchainService } from "./SolanaBlockchainService";
import { StellarBlockchainService } from "./StellarBlockchainService";
import { SuiBlockchainService } from "./SuiBlockchainService";

export function getNonEvmBlockchainService(networkId: NetworkId, rpcUrls: string[]) {
  const { chainType } = deconstructNetworkId(networkId);
  switch (chainType) {
    case "sui": {
      const suiClient = new SuiClientBuilder()
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
        .build();

      return new StellarBlockchainService(client, undefined);
    }
    case "fuel":
    case "canton":
      throw new Error(`Not supported for ${chainType}`);
    case "evm":
      throw new Error(
        `Evm networkId ${networkId} got passed to non-evm blockchain service builder.`
      );
    default:
      return RedstoneCommon.throwUnsupportedParamError(chainType);
  }
}

export function getNonEvmBlockchainServiceWithTransfer(
  networkId: NetworkId,
  rpcUrls: string[],
  privateKey: RedstoneCommon.PrivateKey
) {
  const { chainType } = deconstructNetworkId(networkId);
  switch (chainType) {
    case "sui": {
      const suiClient = new SuiClientBuilder()
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
        .build();
      const keypair = makeStellarKeypair(privateKey.value);

      return new StellarBlockchainService(client, keypair);
    }
    case "fuel":
    case "canton":
      throw new Error(`Not supported for ${chainType}`);
    case "evm":
      throw new Error(
        `Evm networkId ${networkId} got passed to non-evm blockchain service builder.`
      );
    default:
      return RedstoneCommon.throwUnsupportedParamError(chainType);
  }
}
