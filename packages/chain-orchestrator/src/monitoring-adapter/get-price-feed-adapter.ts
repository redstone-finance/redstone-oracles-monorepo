import {
  CantonClientBuilder,
  PricePillCantonContractAdapter,
  readCantonPartyIds,
} from "@redstone-finance/canton-connector";
import { PriceFeedAdapter } from "@redstone-finance/multichain-kit";
import {
  SolanaClientBuilder,
  SolanaPriceFeedContractAdapter,
} from "@redstone-finance/solana-connector";
import {
  PriceFeedStellarContractAdapter,
  Sep40PriceFeedStellarContractAdapter,
  StellarClientBuilder,
} from "@redstone-finance/stellar-connector";
import {
  ChainTypeEnum,
  deconstructNonEvmNetworkId,
  NonEvmNetworkId,
  RedstoneCommon,
} from "@redstone-finance/utils";
import { getCantonAuth } from "../utils";

export async function getPriceFeedAdapter(
  networkId: NonEvmNetworkId,
  address: string,
  rpcUrls: string[],
  feedId?: string,
  withRounds?: boolean
): Promise<PriceFeedAdapter> {
  const { chainType } = deconstructNonEvmNetworkId(networkId);

  switch (chainType) {
    case ChainTypeEnum.enum.stellar: {
      const client = new StellarClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .withMulticall()
        .build();

      if (withRounds) {
        if (!feedId) {
          throw new Error("Stellar SEP-40 requires feedId");
        }

        return new Sep40PriceFeedStellarContractAdapter(client, address, feedId);
      }

      return new PriceFeedStellarContractAdapter(client, address);
    }
    case ChainTypeEnum.enum.canton: {
      if (!feedId) {
        throw new Error("Canton needs feed name for price-feed");
      }

      const chainId = deconstructNonEvmNetworkId(networkId).chainId;
      const auth = await getCantonAuth(chainId);
      const client = new CantonClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .withDefaultAuth(auth)
        .build();

      return new PricePillCantonContractAdapter(
        client,
        readCantonPartyIds().viewerPartyId,
        address,
        feedId
      );
    }
    case ChainTypeEnum.enum.solana: {
      const client = new SolanaClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .withRedStoneConnection()
        .build();

      return SolanaPriceFeedContractAdapter.fromClientAndAddress(client, address);
    }
    case ChainTypeEnum.enum.radix:
    case ChainTypeEnum.enum.fuel:
    case ChainTypeEnum.enum.sui:
    case ChainTypeEnum.enum.aptos:
    case ChainTypeEnum.enum.movement:
      throw new Error(`${networkId} is not supported for getPriceFeedAdapter`);
    default:
      return RedstoneCommon.throwUnsupportedParamError(chainType);
  }
}
