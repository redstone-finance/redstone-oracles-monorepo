import { deconstructNetworkId, RedstoneCommon } from "@redstone-finance/utils";
import { getFuelContractConnector } from "./get-fuel-contract-connector";
import { getMoveContractConnector } from "./get-move-contract-connector";
import { getRadixContractConnector } from "./get-radix-contract-connector";
import { getSolanaContractConnector } from "./get-solana-contract-connector";
import { getStellarContractConnector } from "./get-stellar-contract-connector";
import { getSuiContractConnector } from "./get-sui-contract-connector";
import { PartialRelayerConfig } from "./partial-relayer-config";

export async function getWritableNonEvmContractConnector(relayerConfig: PartialRelayerConfig) {
  const { chainType } = deconstructNetworkId(relayerConfig.networkId);

  switch (chainType) {
    case "fuel":
      return await getFuelContractConnector(relayerConfig);
    case "radix":
      return getRadixContractConnector(relayerConfig);
    case "sui":
      return getSuiContractConnector(relayerConfig);
    case "aptos":
    case "movement":
      return getMoveContractConnector(relayerConfig, chainType);
    case "solana":
      return getSolanaContractConnector(relayerConfig);
    case "stellar":
      return getStellarContractConnector(relayerConfig);
    case "evm":
      throw new Error(
        `Evm relayer config with networkId: ${relayerConfig.networkId} got passed to non-evm blockchain service builder.`
      );
    default:
      return RedstoneCommon.throwUnsupportedParamError(chainType);
  }
}
