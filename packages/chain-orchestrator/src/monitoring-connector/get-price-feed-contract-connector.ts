import {
  PriceFeedStellarContractConnector,
  StellarClientBuilder,
} from "@redstone-finance/stellar-connector";
import { deconstructNetworkId, NetworkId, RedstoneCommon } from "@redstone-finance/utils";

export function getPriceFeedContractConnector(
  networkId: NetworkId,
  address: string,
  rpcUrls: string[]
) {
  const { chainType } = deconstructNetworkId(networkId);

  switch (chainType) {
    case "stellar": {
      const client = new StellarClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .build();

      return new PriceFeedStellarContractConnector(client, address);
    }
    case "radix":
    case "fuel":
    case "sui":
    case "aptos":
    case "movement":
    case "solana":
    case "canton":
    case "evm":
      throw new Error(`${networkId} is not supported for getPriceFeedContractConnector`);
    default:
      return RedstoneCommon.throwUnsupportedParamError(chainType);
  }
}
