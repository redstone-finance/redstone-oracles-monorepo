import { ChainTypeEnum, deconstructNetworkId, RedstoneCommon } from "@redstone-finance/utils";
import { forceGetBlockProvider } from "../provider/chain-provider";
import { getCantonContractAdapter } from "./get-canton-contract-adapter";
import { getMoveContractAdapter } from "./get-move-contract-adapter";
import { getSolanaContractAdapter } from "./get-solana-contract-adapter";
import { getStellarContractAdapter } from "./get-stellar-contract-adapter";
import { getSuiContractAdapter } from "./get-sui-contract-adapter";
import { PartialRelayerConfig } from "./partial-relayer-config";

export async function getWritableNonEvmContractAdapter(relayerConfig: PartialRelayerConfig) {
  const blockProvider = await forceGetBlockProvider(relayerConfig.networkId, relayerConfig.rpcUrls);
  const adapter = getNonEvmContractAdapter(relayerConfig);

  return { adapter, blockProvider };
}

function getNonEvmContractAdapter(relayerConfig: PartialRelayerConfig) {
  const { chainType } = deconstructNetworkId(relayerConfig.networkId);

  switch (chainType) {
    case ChainTypeEnum.enum.sui:
      return getSuiContractAdapter(relayerConfig);
    case ChainTypeEnum.enum.aptos:
    case ChainTypeEnum.enum.movement:
      return getMoveContractAdapter(relayerConfig, chainType);
    case ChainTypeEnum.enum.solana:
      return getSolanaContractAdapter(relayerConfig);
    case ChainTypeEnum.enum.stellar:
      return getStellarContractAdapter(relayerConfig);
    case ChainTypeEnum.enum.canton:
      return getCantonContractAdapter(relayerConfig);
    case ChainTypeEnum.enum.radix:
    case ChainTypeEnum.enum.fuel:
    case ChainTypeEnum.enum.evm:
      throw new Error(
        `Evm relayer config with networkId: ${relayerConfig.networkId} got passed to non-evm blockchain service builder.`
      );
    default:
      return RedstoneCommon.throwUnsupportedParamError(chainType);
  }
}
