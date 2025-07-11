import { TxDeliveryCall } from "@redstone-finance/rpc-providers";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { Tx } from "@redstone-finance/utils";
import {
  IStylusAdapter,
  MultiFeedAdapterWithoutRounds,
} from "../../../typechain-types";
import { MultiFeedEvmContractAdapterBase } from "./MultiFeedEvmContractAdapterBase";

export class StylusContractAdapter extends MultiFeedEvmContractAdapterBase<
  MultiFeedAdapterWithoutRounds & IStylusAdapter
> {
  override async makeUpdateTx(
    paramsProvider: ContractParamsProvider,
    metadataTimestamp: number
  ): Promise<TxDeliveryCall> {
    const feedsIds = paramsProvider.getHexlifiedFeedIds(true, 32);
    const payload = await paramsProvider.getPayloadHex(true, {
      componentName: "stylus-adapter",
      withUnsignedMetadata: true,
      metadataTimestamp,
    });

    const tx = await this.adapterContract.populateTransaction.writePrices(
      feedsIds,
      payload
    );

    return Tx.convertToTxDeliveryCall(tx);
  }
}
