import { providers } from "ethers";
import { EvmContractAdapter } from "../../core/contract-interactions/EvmContractAdapter";
import { EvmContractConnector } from "../../core/contract-interactions/EvmContractConnector";
import { RedstoneEvmContract } from "./RedstoneEvmContract";

export function getEvmContractConnector(
  provider: providers.Provider,
  adapter: EvmContractAdapter<RedstoneEvmContract>
) {
  return new EvmContractConnector(provider, adapter);
}
