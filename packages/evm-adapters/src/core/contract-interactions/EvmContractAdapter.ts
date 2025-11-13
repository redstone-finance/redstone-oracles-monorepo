import {
  ContractData,
  ContractParamsProvider,
  IRedstoneContractAdapter,
  UpdatePricesOptions,
} from "@redstone-finance/sdk";
import { Tx } from "@redstone-finance/utils";
import { RedstoneEvmContract } from "../../facade/evm/RedstoneEvmContract";

export abstract class EvmContractAdapter<Contract extends RedstoneEvmContract>
  implements IRedstoneContractAdapter
{
  constructor(
    public adapterContract: Contract,
    protected txDeliveryMan: Tx.ITxDeliveryMan<
      Tx.TxDeliveryManContext & {
        paramsProvider?: ContractParamsProvider;
        canOmitFallbackAfterFailing?: boolean;
      }
    >
  ) {}

  getDataFeedIds(_blockTag: number): Promise<string[] | undefined> {
    return Promise.resolve(undefined);
  }

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

  async readContractData(
    feedIds: string[],
    blockNumber: number,
    withDataFeedValues: boolean
  ): Promise<ContractData> {
    return await this.readLatestRoundContractData(feedIds, blockNumber, withDataFeedValues);
  }

  async getUniqueSignerThreshold(blockTag?: number): Promise<number> {
    return await this.adapterContract.getUniqueSignersThreshold({ blockTag });
  }

  async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider,
    options?: UpdatePricesOptions
  ) {
    const metadataTimestamp = Date.now();
    const baseParamsProvider = this.getBaseIterationTxParamsProvider(paramsProvider, options);
    const updateTx = await this.makeUpdateTx(baseParamsProvider, metadataTimestamp);

    return await this.txDeliveryMan.deliver(updateTx, {
      deferredCallData: () =>
        this.makeUpdateTx(paramsProvider, metadataTimestamp).then((tx) => tx.data),
      paramsProvider: baseParamsProvider,
      canOmitFallbackAfterFailing: options?.canOmitFallbackAfterFailing,
    });
  }

  protected getBaseIterationTxParamsProvider(
    paramsProvider: ContractParamsProvider,
    _options?: UpdatePricesOptions
  ) {
    return paramsProvider;
  }
}
