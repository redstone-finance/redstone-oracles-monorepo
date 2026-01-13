import {
  getStellarNetwork,
  makeKeypair,
  PriceAdapterStellarContractConnector,
  StellarClientBuilder,
  StellarNetwork,
} from "@redstone-finance/stellar-connector";
import { deconstructNetworkId, RedstoneCommon } from "@redstone-finance/utils";
import { PartialRelayerConfig } from "./partial-relayer-config";

const HORIZON_URL_MAINNET = "https://horizon.stellar.org";
const HORIZON_URL_TESTNET = "https://horizon-testnet.stellar.org";

function getHorizonUrl(network: StellarNetwork) {
  switch (network) {
    case "mainnet":
      return HORIZON_URL_MAINNET;
    case "testnet":
      return HORIZON_URL_TESTNET;
    case "custom":
      return undefined;
    default:
      RedstoneCommon.throwUnsupportedParamError(network);
  }
}

export const getStellarContractConnector = (relayerConfig: PartialRelayerConfig) => {
  const {
    adapterContractAddress,
    privateKey,
    rpcUrls,
    networkId,
    gasLimit,
    gasMultiplier,
    maxTxSendAttempts,
    expectedTxDeliveryTimeInMS,
  } = relayerConfig;

  const { chainId } = deconstructNetworkId(networkId);
  const horizonUrl = getHorizonUrl(getStellarNetwork(chainId));

  const client = new StellarClientBuilder()
    .withNetworkId(networkId)
    .withRpcUrls(rpcUrls)
    .withQuarantineEnabled()
    .withHorizonUrl(horizonUrl)
    .build();

  const txDeliveryManConfig = {
    gasLimit,
    gasMultiplier,
    maxTxSendAttempts,
    expectedTxDeliveryTimeInMS,
  };

  return new PriceAdapterStellarContractConnector(
    client,
    adapterContractAddress,
    makeKeypair(privateKey),
    txDeliveryManConfig
  );
};
