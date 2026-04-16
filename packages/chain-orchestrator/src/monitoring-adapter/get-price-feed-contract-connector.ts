import {
  CantonClientBuilder,
  PricePillCantonContractConnector,
} from "@redstone-finance/canton-connector";
import {
  PriceFeedStellarContractConnector,
  StellarClientBuilder,
} from "@redstone-finance/stellar-connector";
import { deconstructNetworkId, NetworkId, RedstoneCommon } from "@redstone-finance/utils";
import { getCantonAuth } from "../utils";

export async function getPriceFeedContractConnector(
  networkId: NetworkId,
  address: string,
  rpcUrls: string[],
  feedName?: string
) {
  const { chainType } = deconstructNetworkId(networkId);

  switch (chainType) {
    case "stellar": {
      const client = new StellarClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .withMulticall()
        .build();

      return new PriceFeedStellarContractConnector(client, address);
    }
    case "canton": {
      if (!feedName) {
        throw new Error("Canton need feed name for price-feed");
      }

      const auth = await getCantonAuth(deconstructNetworkId(networkId).chainId);
      const client = new CantonClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .withDefaultAuth(auth)
        .build();

      return new PricePillCantonContractConnector(
        client,
        RedstoneCommon.getFromEnv("VIEWER_PARTY_ID"),
        address,
        feedName
      );
    }
    case "radix":
    case "fuel":
    case "sui":
    case "aptos":
    case "movement":
    case "solana":
    case "evm":
      throw new Error(`${networkId} is not supported for getPriceFeedContractConnector`);
    default:
      return RedstoneCommon.throwUnsupportedParamError(chainType);
  }
}
