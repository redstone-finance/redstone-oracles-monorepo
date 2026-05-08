import {
  CantonClientBuilder,
  PricePillCantonContractAdapter,
} from "@redstone-finance/canton-connector";
import { PriceFeedAdapter } from "@redstone-finance/multichain-kit";
import {
  SolanaConnectionBuilder,
  SolanaPriceFeedContractAdapter,
} from "@redstone-finance/solana-connector";
import {
  PriceFeedStellarContractAdapter,
  Sep40PriceFeedStellarContractAdapter,
  StellarClientBuilder,
} from "@redstone-finance/stellar-connector";
import { deconstructNetworkId, NetworkId, RedstoneCommon } from "@redstone-finance/utils";
import { getCantonAuth } from "../utils";

export async function getPriceFeedAdapter(
  networkId: NetworkId,
  address: string,
  rpcUrls: string[],
  feedId?: string,
  withRounds?: boolean
): Promise<PriceFeedAdapter> {
  const { chainType } = deconstructNetworkId(networkId);

  switch (chainType) {
    case "stellar": {
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
    case "canton": {
      if (!feedId) {
        throw new Error("Canton needs feed name for price-feed");
      }

      const chainId = deconstructNetworkId(networkId).chainId;
      const auth = await getCantonAuth(chainId);
      const client = new CantonClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .withDefaultAuth(auth)
        .build();

      return new PricePillCantonContractAdapter(
        client,
        RedstoneCommon.getFromEnv("VIEWER_PARTY_ID"),
        address,
        feedId
      );
    }
    case "solana": {
      const connection = new SolanaConnectionBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .withRedStoneConnection()
        .build();

      return SolanaPriceFeedContractAdapter.fromConnectionAndAddress(connection, address);
    }
    case "radix":
    case "fuel":
    case "sui":
    case "aptos":
    case "movement":
    case "evm":
      throw new Error(`${networkId} is not supported for getPriceFeedAdapter`);
    default:
      return RedstoneCommon.throwUnsupportedParamError(chainType);
  }
}
