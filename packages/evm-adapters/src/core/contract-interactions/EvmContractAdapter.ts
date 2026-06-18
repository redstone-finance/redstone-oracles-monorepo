import { BaseContract } from "@ethersproject/contracts";
import { DataPackagesWrapper } from "@redstone-finance/evm-connector";
import { WriteContractAdapter } from "@redstone-finance/multichain-kit";
import {
  ContractData,
  ContractParamsProvider,
  getDataPackagesTimestamp,
  UpdatePricesOptions,
} from "@redstone-finance/sdk";
import { Tx } from "@redstone-finance/utils";
import { RedstoneEvmContract } from "../../facade/evm/RedstoneEvmContract";

export abstract class EvmContractAdapter<Contract extends RedstoneEvmContract>
  implements WriteContractAdapter
{
  static async wrapContract<C extends BaseContract>(
    adapterContract: C,
    paramsProvider: ContractParamsProvider,
    metadataTimestamp?: number
  ) {
    const packageResponse = await paramsProvider.requestDataPackagesWithFeedsInfo();
    const dataPackagesWrapper = new DataPackagesWrapper<C>(packageResponse.dataPackages);
    const proposedTimestamp = getDataPackagesTimestamp(packageResponse.dataPackages);

    if (metadataTimestamp) {
      dataPackagesWrapper.setMetadataTimestamp(metadataTimestamp);
    }
    const wrappedContract = dataPackagesWrapper.overwriteEthersContract(adapterContract);

    return { proposedTimestamp, wrappedContract, dataPackagesWrapper, packageResponse };
  }

  constructor(
    public adapterContract: Contract,
    protected txDeliveryMan: Tx.ITxDeliveryMan<
      Tx.TxDeliveryManContext & {
        paramsProvider?: ContractParamsProvider;
        canOmitFallbackAfterFailing?: boolean;
      }
    >
  ) {}

  async getSignerAddress() {
    return await this.adapterContract.signer.getAddress();
  }

  abstract makeUpdateTx(
    paramsProvider: ContractParamsProvider,
    metadataTimestamp: number
  ): Promise<Tx.TxDeliveryCall>;

  abstract readLatestRoundContractData(
    feedIds: string[],
    blockNumber?: number,
    withDataFeedValues?: boolean
  ): Promise<ContractData>;

  async readContractData(feedIds: string[], blockNumber?: number, withDataFeedValues = true) {
    return await this.readLatestRoundContractData(feedIds, blockNumber, withDataFeedValues);
  }

  async getUniqueSignerThreshold(blockTag?: number) {
    return await this.adapterContract.getUniqueSignersThreshold({ blockTag });
  }

  async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider,
    options?: UpdatePricesOptions
  ) {
    const metadataTimestamp = Date.now();
    const baseParamsProvider = this.getBaseIterationTxParamsProvider(paramsProvider, options);
    const updateTx = await this.makeUpdateTx(baseParamsProvider, metadataTimestamp);

    return (await this.txDeliveryMan.deliver(updateTx, {
      deferredCallData: () =>
        this.makeUpdateTx(paramsProvider, metadataTimestamp).then((tx) => tx.data),
      paramsProvider: baseParamsProvider,
      canOmitFallbackAfterFailing: options?.canOmitFallbackAfterFailing,
    })) as string;
  }

  protected getBaseIterationTxParamsProvider(
    paramsProvider: ContractParamsProvider,
    _options?: UpdatePricesOptions
  ) {
    return paramsProvider;
  }
}
