import { Provider } from "@ethersproject/providers";
import {
  getEvmContract,
  getEvmContractAdapter,
  MultiFeedAdapterWithoutRounds,
  RedstoneEvmContract,
} from "@redstone-finance/evm-adapters";
import { TxDeliveryManSupportedProviders } from "@redstone-finance/rpc-providers";
import { DataPackagesResponseCache } from "@redstone-finance/sdk";
import { Tx } from "@redstone-finance/utils";
import { Signer, Wallet } from "ethers";
import { isOevRelayerConfig } from "../../config/config-checks";
import { RelayerConfig } from "../../config/RelayerConfig";
import { getRelayerProvider } from "../../core/contract-interactions/get-relayer-provider";
import { OevMultiAuctionsTxDeliveryMan } from "../../core/contract-interactions/OevMultiAuctionsTxDeliveryMan";
import { OevTxDeliveryMan } from "../../core/contract-interactions/OevTxDeliveryMan";
import { getTxDeliveryMan } from "../../core/TxDeliveryManSingleton";
import { ContractFacade } from "../ContractFacade";
import { MemoryTxDeliveryMan } from "../MemoryTxDeliveryMan";

export const getEvmContractFacade = (
  relayerConfig: RelayerConfig,
  cache?: DataPackagesResponseCache
) => {
  const { privateKey } = relayerConfig;
  const provider = getRelayerProvider(relayerConfig);
  const signer = new Wallet(privateKey, provider);
  const adapterContract = getEvmContract(relayerConfig, signer);

  const txDeliveryMan = makeTxDeliveryMan(relayerConfig, signer, provider, adapterContract);

  const adapter = getEvmContractAdapter(relayerConfig, adapterContract, txDeliveryMan);

  return new ContractFacade(adapter, provider, relayerConfig, cache);
};

function makeTxDeliveryMan(
  relayerConfig: RelayerConfig,
  signer: Wallet,
  provider: Signer | Provider,
  adapterContract: RedstoneEvmContract
) {
  let txDeliveryMan: Tx.ITxDeliveryMan = getTxDeliveryMan(
    relayerConfig,
    signer,
    provider as TxDeliveryManSupportedProviders
  );

  if (relayerConfig.dryRunWithMemory) {
    txDeliveryMan = new MemoryTxDeliveryMan(relayerConfig);
  }

  if (isOevRelayerConfig(relayerConfig)) {
    if (relayerConfig.oevMultiAuctions) {
      txDeliveryMan = new OevMultiAuctionsTxDeliveryMan(
        txDeliveryMan,
        adapterContract as MultiFeedAdapterWithoutRounds,
        relayerConfig
      );
    } else {
      txDeliveryMan = new OevTxDeliveryMan(txDeliveryMan, adapterContract, relayerConfig);
    }
  }

  return txDeliveryMan;
}
