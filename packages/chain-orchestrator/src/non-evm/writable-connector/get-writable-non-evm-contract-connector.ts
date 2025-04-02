import {
  FUEL,
  isNonEvmAdapterType,
  MOVEMENT_MULTI_FEED,
  RADIX_MULTI_FEED,
  SOLANA_MULTI_FEED,
  SUI_MULTI_FEED,
} from "@redstone-finance/on-chain-relayer-common";
import { getFuelContractConnector } from "./get-fuel-contract-connector";
import { getMovementContractConnector } from "./get-movement-contract-connector";
import { getRadixContractConnector } from "./get-radix-contract-connector";
import { getSuiContractConnector } from "./get-sui-contract-connector";
import { PartialRelayerConfig } from "./partial-relayer-config";

export async function getWritableNonEvmContractConnector(
  relayerConfig: PartialRelayerConfig
) {
  if (!isNonEvmAdapterType(relayerConfig.adapterContractType)) {
    throw new Error(
      `${relayerConfig.adapterContractType} is not supported for non-evm`
    );
  }

  switch (relayerConfig.adapterContractType) {
    case FUEL:
      return await getFuelContractConnector(relayerConfig);
    case RADIX_MULTI_FEED:
      return getRadixContractConnector(relayerConfig);
    case SUI_MULTI_FEED:
      return getSuiContractConnector(relayerConfig);
    case MOVEMENT_MULTI_FEED:
      return getMovementContractConnector(relayerConfig);
    case SOLANA_MULTI_FEED:
      throw new Error("Not implemented");
  }
}
