import { ContractParamsProvider } from "@redstone-finance/sdk";
import { Tx } from "@redstone-finance/utils";
import { UpdatePricesOptions } from "../../facade/ContractFacade";
import { RedstoneEvmContract } from "../../facade/evm/EvmContractFacade";
import { ContractData } from "../../types";
import { IRedstoneContractAdapter } from "./IRedstoneContractAdapter";
import { RelayerTxDeliveryManContext } from "./RelayerTxDeliveryManContext";

export abstract class EvmContractAdapter<Contract extends RedstoneEvmContract>
  implements IRedstoneContractAdapter
{
  constructor(
    public adapterContract: Contract,
    protected txDeliveryMan: Tx.ITxDeliveryMan
  ) {}

  getSignerAddress(): Promise<string | undefined> {
    return this.adapterContract.signer.getAddress();
  }

  abstract makeUpdateTx(
    paramsProvider: ContractParamsProvider,
    metadataTimestamp: number
  ): Promise<Tx.TxDeliveryCall>;

  abstract readLatestRoundContractData(
    feedIds: string[],
    blockNumber: number,
    withDataFeedValues: boolean
  ): Promise<ContractData>;

  async getUniqueSignerThreshold(blockTag?: number): Promise<number> {
    return await this.adapterContract.getUniqueSignersThreshold({ blockTag });
  }

  async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider,
    options?: UpdatePricesOptions
  ) {
    const metadataTimestamp = Date.now();
    const baseParamsProvider = this.getBaseIterationTxParamsProvider(
      paramsProvider,
      options
    );
    const updateTx = await this.makeUpdateTx(
      baseParamsProvider,
      metadataTimestamp
    );

    return await this.txDeliveryMan.deliver(updateTx, {
      deferredCallData: () =>
        this.makeUpdateTx(paramsProvider, metadataTimestamp).then(
          (tx) => tx.data
        ),
      paramsProvider: baseParamsProvider,
      canOmitFallbackAfterFailing: options?.canOmitFallbackAfterFailing,
    } as RelayerTxDeliveryManContext);
  }

  protected getBaseIterationTxParamsProvider(
    paramsProvider: ContractParamsProvider,
    _options?: UpdatePricesOptions
  ) {
    return paramsProvider;
  }
}
