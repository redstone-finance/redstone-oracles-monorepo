import {
  PriceAdapterRadixContractConnector,
  RadixClient,
} from "@redstone-finance/radix-connector";
import { PartialRelayerConfig } from "./partial-relayer-config";

export const getRadixContractConnector = (
  relayerConfig: PartialRelayerConfig
) => {
  const { privateKey, adapterContractAddress, chainId } = relayerConfig;

  const client = new RadixClient(chainId, { ed25519: privateKey });

  return new PriceAdapterRadixContractConnector(client, adapterContractAddress);
};
