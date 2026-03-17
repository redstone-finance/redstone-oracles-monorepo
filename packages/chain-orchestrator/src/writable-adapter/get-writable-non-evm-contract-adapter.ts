import { deconstructNetworkId, RedstoneCommon } from "@redstone-finance/utils";
import { getCantonContractAdapter } from "./get-canton-contract-adapter";
import { getFuelContractAdapter } from "./get-fuel-contract-adapter";
import { getMoveContractAdapter } from "./get-move-contract-adapter";
import { getRadixContractAdapter } from "./get-radix-contract-adapter";
import { getSolanaContractAdapter } from "./get-solana-contract-adapter";
import { getStellarContractAdapter } from "./get-stellar-contract-adapter";
import { getSuiContractAdapter } from "./get-sui-contract-adapter";
import { PartialRelayerConfig } from "./partial-relayer-config";

export async function getWritableNonEvmContractAdapter(relayerConfig: PartialRelayerConfig) {
  const { chainType } = deconstructNetworkId(relayerConfig.networkId);

  switch (chainType) {
    case "fuel":
      return await getFuelContractAdapter(relayerConfig);
    case "radix":
      return await getRadixContractAdapter(relayerConfig);
    case "sui":
      return getSuiContractAdapter(relayerConfig);
    case "aptos":
    case "movement":
      return await getMoveContractAdapter(relayerConfig, chainType);
    case "solana":
      return getSolanaContractAdapter(relayerConfig);
    case "stellar":
      return getStellarContractAdapter(relayerConfig);
    case "canton":
      return getCantonContractAdapter(relayerConfig);
    case "evm":
      throw new Error(
        `Evm relayer config with networkId: ${relayerConfig.networkId} got passed to non-evm blockchain service builder.`
      );
    default:
      return RedstoneCommon.throwUnsupportedParamError(chainType);
  }
}
