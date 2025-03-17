import {
  ContractData,
  ContractParamsProvider,
  IMultiFeedPricesContractAdapter,
} from "@redstone-finance/sdk";
import { BigNumber, BigNumberish } from "ethers";
import _ from "lodash";
import { RadixContractAdapter } from "../../radix/RadixContractAdapter";
import { GetPricesRadixMethod } from "./methods/GetPricesRadixMethod";
import { ReadPriceDataRadixMethod } from "./methods/ReadPriceDataRadixMethod";
import { ReadPricesRadixMethod } from "./methods/ReadPricesRadixMethod";
import { ReadTimestampRadixMethod } from "./methods/ReadTimestampRadixMethod";
import { WritePricesRadixMethod } from "./methods/WritePricesRadixMethod";
import { WritePricesTrustedRadixMethod } from "./methods/WritePricesTrustedRadixMethod";

export class PriceAdapterRadixContractAdapter
  extends RadixContractAdapter
  implements IMultiFeedPricesContractAdapter
{
  async getSignerAddress() {
    return await this.client.getAccountAddress();
  }

  async getPricesFromPayload(
    paramsProvider: ContractParamsProvider
  ): Promise<BigNumberish[]> {
    return (
      await this.client.call(
        new GetPricesRadixMethod(
          this.componentId,
          paramsProvider.getDataFeedIds(),
          await paramsProvider.getPayloadData()
        )
      )
    ).values;
  }

  async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider
  ): Promise<string | BigNumberish[]> {
    const resourceAddress: string | undefined = await this.client.readValue(
      this.componentId,
      "trusted_updater_resource"
    );
    const publicKeyHex = this.client.getPublicKeyHex();

    return (
      await this.client.call(
        resourceAddress && publicKeyHex
          ? new WritePricesTrustedRadixMethod(
              this.componentId,
              paramsProvider.getDataFeedIds(),
              await paramsProvider.getPayloadData({
                withUnsignedMetadata: true,
              }),
              {
                resourceAddress,
                localId: `<${publicKeyHex}>`,
              }
            )
          : new WritePricesRadixMethod(
              this.componentId,
              paramsProvider.getDataFeedIds(),
              await paramsProvider.getPayloadData({
                withUnsignedMetadata: true,
              })
            )
      )
    ).values;
  }

  async getUniqueSignerThreshold(): Promise<number> {
    return Number(
      await this.client.readValue(this.componentId, "signer_count_threshold")
    );
  }

  async readPricesFromContract(paramsProvider: ContractParamsProvider) {
    if (this.readMode === "ReadFromStorage") {
      const priceData = await this.readPriceData();

      return paramsProvider
        .getDataFeedIds()
        .map((feedId) => priceData[feedId].lastValue);
    } else {
      return await this.client.call(
        new ReadPricesRadixMethod(
          this.componentId,
          paramsProvider.getDataFeedIds()
        )
      );
    }
  }

  async readTimestampFromContract(feedId?: string) {
    if (this.readMode === "ReadFromStorage") {
      const priceData = await this.readPriceData();

      return Number(priceData[feedId!].lastDataPackageTimestampMS);
    } else {
      return Number(
        await this.client.call(
          new ReadTimestampRadixMethod(this.componentId, feedId)
        )
      );
    }
  }

  async readLatestUpdateBlockTimestamp(
    feedId?: string
  ): Promise<number | undefined> {
    const priceData = await this.readPriceData();

    return priceData[feedId!].lastBlockTimestampMS;
  }

  async readContractData(feedIds: string[]): Promise<ContractData> {
    if (this.readMode === "ReadFromStorage") {
      const priceData = await this.readPriceData();

      return _.pick(priceData, feedIds);
    } else {
      const priceData = await this.client.call(
        new ReadPriceDataRadixMethod(this.componentId, feedIds)
      );

      return Object.fromEntries(
        _.zip(
          feedIds,
          priceData.map(
            PriceAdapterRadixContractAdapter.convertRawToLastDetails
          )
        )
      ) as ContractData;
    }
  }

  private async readPriceData(): Promise<ContractData> {
    const priceMap: {
      [p: string]: [BigNumberish, BigNumberish, BigNumberish];
    } = await this.client.readValue(this.componentId, "prices");

    return Object.fromEntries(
      Object.entries(priceMap).map(([feedId, data]) => [
        ContractParamsProvider.unhexlifyFeedId(feedId),
        PriceAdapterRadixContractAdapter.convertRawToLastDetails(data),
      ])
    );
  }

  static convertRawToLastDetails(
    data: [BigNumberish, BigNumberish, BigNumberish]
  ) {
    return {
      lastDataPackageTimestampMS: Number(data[2]),
      lastBlockTimestampMS: Number(data[1]),
      lastValue: BigNumber.from(data[0]),
    };
  }
}
