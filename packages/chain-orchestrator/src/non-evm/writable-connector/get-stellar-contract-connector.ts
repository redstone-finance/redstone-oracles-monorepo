import {
  getStellarNetwork,
  makeKeypair,
  PriceAdapterStellarContractConnector,
  StellarClientBuilder,
} from "@redstone-finance/stellar-connector";
import { deconstructNetworkId } from "@redstone-finance/utils";
import { PartialRelayerConfig } from "./partial-relayer-config";

const HORIZON_URL_MAINNET = "https://horizon.stellar.org";
const HORIZON_URL_TESTNET = "https://horizon-testnet.stellar.org";

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

  let horizonUrl = undefined;
  const { chainId } = deconstructNetworkId(networkId);
  switch (getStellarNetwork(chainId)) {
    case "mainnet":
      horizonUrl = HORIZON_URL_MAINNET;
      break;
    case "testnet":
      horizonUrl = HORIZON_URL_TESTNET;
      break;
  }

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
