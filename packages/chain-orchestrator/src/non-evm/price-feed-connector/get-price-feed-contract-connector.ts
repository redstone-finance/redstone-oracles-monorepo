import {
  PriceFeedStellarContractConnector,
  StellarClientBuilder,
} from "@redstone-finance/stellar-connector";
import { deconstructNetworkId, NetworkId, RedstoneCommon } from "@redstone-finance/utils";
import { Keypair } from "@stellar/stellar-sdk";

export function getPriceFeedContractConnector(
  networkId: NetworkId,
  address: string,
  rpcUrls: string[],
  readerAddress?: string
) {
  const { chainType } = deconstructNetworkId(networkId);

  switch (chainType) {
    case "stellar": {
      const client = new StellarClientBuilder()
        .withNetworkId(networkId)
        .withRpcUrls(rpcUrls)
        .build();
      if (!readerAddress) {
        throw new Error(`readerAddress is needed for ${chainType}`);
      }
      return new PriceFeedStellarContractConnector(
        client,
        address,
        Keypair.fromPublicKey(readerAddress)
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
