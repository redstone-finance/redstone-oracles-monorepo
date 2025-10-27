import { Provider } from "@ethersproject/providers";
import {
  getEvmContract,
  getEvmContractAdapter,
  getEvmContractConnector,
  isOevRelayerConfig,
  MultiFeedAdapterWithoutRounds,
  RedstoneEvmContract,
} from "@redstone-finance/evm-adapters";
import { TxDeliveryManSupportedProviders } from "@redstone-finance/rpc-providers";
import { DataPackagesResponseCache } from "@redstone-finance/sdk";
import { Tx } from "@redstone-finance/utils";
import { Signer, Wallet } from "ethers";
import { RelayerConfig } from "../../config/RelayerConfig";
import { getRelayerProvider } from "../../core/contract-interactions/get-relayer-provider";
import { OevMultiAuctionsTxDeliveryMan } from "../../core/contract-interactions/OevMultiAuctionsTxDeliveryMan";
import { OevTxDeliveryMan } from "../../core/contract-interactions/OevTxDeliveryMan";
import { getTxDeliveryMan } from "../../core/TxDeliveryManSingleton";
import { RelayerDataInfluxService } from "../RelayerDataInfluxService";
import { EvmContractFacade } from "./EvmContractFacade";

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

  return new EvmContractFacade(getEvmContractConnector(provider, adapter), relayerConfig, cache);
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

  if (relayerConfig.dryRunWithInflux) {
    txDeliveryMan = new RelayerDataInfluxService(relayerConfig);
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
