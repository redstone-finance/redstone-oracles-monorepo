import { ContractParamsProvider, ValuesForDataFeeds } from "@redstone-finance/sdk";
import { Tx } from "@redstone-finance/utils";
import { MentoAdapterBase } from "../../../typechain-types";
import { getSortedOraclesContractAtAddress } from "../../custom-integrations/mento/get-sorted-oracles-contract-at-address";
import {
  getValuesForMentoDataFeeds,
  prepareLinkedListLocationsForMentoAdapterReport,
} from "../../custom-integrations/mento/mento-utils";
import { PriceFeedsEvmContractAdapter } from "./PriceFeedsEvmContractAdapter";

export class MentoEvmContractAdapter extends PriceFeedsEvmContractAdapter<MentoAdapterBase> {
  constructor(
    adapterContract: MentoAdapterBase,
    txDeliveryMan: Tx.ITxDeliveryMan,
    private maxDeviationAllowed?: number
  ) {
    super(adapterContract, txDeliveryMan);
  }

  override async getValuesForDataFeeds(
    dataFeeds: string[],
    blockTag: number
  ): Promise<ValuesForDataFeeds> {
    const sortedOraclesAddress = await this.adapterContract.getSortedOracles({
      blockTag,
    });

    return await getValuesForMentoDataFeeds(
      this.adapterContract,
      getSortedOraclesContractAtAddress(sortedOraclesAddress, this.adapterContract.provider),
      dataFeeds,
      blockTag
    );
  }

  override async makeUpdateTx(paramsProvider: ContractParamsProvider, metadataTimestamp: number) {
    const [
      blockTag,
      { proposedTimestamp, wrappedContract: wrappedMentoContract, dataPackagesWrapper },
    ] = await Promise.all([
      this.adapterContract.provider.getBlockNumber(),
      MentoEvmContractAdapter.wrapContract(this.adapterContract, paramsProvider, metadataTimestamp),
    ]);

    const sortedOraclesAddress = await this.adapterContract.getSortedOracles({
      blockTag,
    });
    const sortedOracles = getSortedOraclesContractAtAddress(
      sortedOraclesAddress,
      this.adapterContract.provider
    );

    const linkedListPositions = await prepareLinkedListLocationsForMentoAdapterReport(
      {
        mentoAdapter: this.adapterContract,
        dataPackagesWrapper,
        sortedOracles,
      },
      blockTag,
      this.maxDeviationAllowed
    );
    if (!linkedListPositions) {
      throw new Error(
        `Prices in Sorted Oracles deviated more than ${this.maxDeviationAllowed}% from RedStone prices`
      );
    }

    const txCall = Tx.convertToTxDeliveryCall(
      await wrappedMentoContract.populateTransaction["updatePriceValuesAndCleanOldReports"](
        proposedTimestamp,
        linkedListPositions
      )
    );

    return txCall;
  }
}
