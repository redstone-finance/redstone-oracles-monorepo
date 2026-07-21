import {
  getEvmContract,
  getEvmContractAdapter,
  MultiFeedAdapterWithoutRounds,
  OevMultiAuctionsTxDeliveryMan,
  OevTxDeliveryMan,
  RedstoneEvmContract,
} from "@redstone-finance/evm-adapters";
import { TxDeliveryManSupportedProviders } from "@redstone-finance/rpc-providers";
import { RedstoneCommon, Tx } from "@redstone-finance/utils";
import { providers, Wallet } from "ethers";
import { getRelayerProvider } from "./get-relayer-provider";
import { getTxDeliveryMan } from "./get-tx-delivery-man";
import { EvmRelayerConfig } from "./partial-relayer-config";

export function getWritableEvmContractAdapter(
  relayerConfig: EvmRelayerConfig,
  deliveryManOverride?: Tx.ITxDeliveryMan
) {
  const blockProvider = getRelayerProvider(relayerConfig);
  const signer = new Wallet(relayerConfig.privateKey, blockProvider);
  const adapterContract = getEvmContract(relayerConfig, signer);
  const txDeliveryMan = makeTxDeliveryMan(
    relayerConfig,
    signer,
    blockProvider,
    adapterContract,
    deliveryManOverride
  );
  const adapter = getEvmContractAdapter(relayerConfig, adapterContract, txDeliveryMan);

  return { adapter, blockProvider };
}

function makeTxDeliveryMan(
  relayerConfig: EvmRelayerConfig,
  signer: Wallet,
  provider: providers.Provider,
  adapterContract: RedstoneEvmContract,
  deliveryManOverride?: Tx.ITxDeliveryMan
) {
  let txDeliveryMan: Tx.ITxDeliveryMan =
    deliveryManOverride ??
    getTxDeliveryMan(relayerConfig, signer, provider as TxDeliveryManSupportedProviders);

  if (RedstoneCommon.isTruthy(relayerConfig.oevAuctionUrl?.length)) {
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
