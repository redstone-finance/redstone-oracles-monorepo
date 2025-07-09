import {
  ContractData,
  ContractParamsProvider,
  IMultiFeedPricesContractAdapter,
} from "@redstone-finance/sdk";
import { BigNumber, BigNumberish } from "ethers";
import _ from "lodash";
import { RadixClient } from "../../radix/RadixClient";
import { RadixContractAdapter } from "../../radix/RadixContractAdapter";
import { RadixInvocation } from "../../radix/RadixInvocation";
import { NonFungibleGlobalIdInput } from "../../radix/utils";
import {
  GetPricesRadixMethod,
  PricesAndTimestamp,
} from "./methods/GetPricesRadixMethod";
import { ReadPriceDataRadixMethod } from "./methods/ReadPriceDataRadixMethod";
import { ReadPricesRadixMethod } from "./methods/ReadPricesRadixMethod";
import { ReadTimestampRadixMethod } from "./methods/ReadTimestampRadixMethod";
import { WritePricesRadixMethod } from "./methods/WritePricesRadixMethod";
import { WritePricesTrustedRadixMethod } from "./methods/WritePricesTrustedRadixMethod";

export class PriceAdapterRadixContractAdapter
  extends RadixContractAdapter
  implements IMultiFeedPricesContractAdapter
{
  private trustedUpdaterProofBadge?: NonFungibleGlobalIdInput;

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
    const metadataTimestamp = Date.now();
    const provider = async () =>
      await this.getWritePricesMethod(paramsProvider, metadataTimestamp);

    return (await this.client.callWithProvider<PricesAndTimestamp>(provider))
      .values;
  }

  private async getWritePricesMethod(
    paramsProvider: ContractParamsProvider,
    metadataTimestamp?: number
  ): Promise<RadixInvocation<PricesAndTimestamp>> {
    const payloadData = await paramsProvider.getPayloadData({
      withUnsignedMetadata: true,
      metadataTimestamp,
    });

    const proofBadge = await this.getTrustedUpdaterProofBadge();
    return proofBadge
      ? new WritePricesTrustedRadixMethod(
          this.componentId,
          paramsProvider.getDataFeedIds(),
          payloadData,
          proofBadge
        )
      : new WritePricesRadixMethod(
          this.componentId,
          paramsProvider.getDataFeedIds(),
          payloadData
        );
  }

  async getUniqueSignerThreshold(stateVersion?: number): Promise<number> {
    return Number(
      await this.client.readValue(
        this.componentId,
        "signer_count_threshold",
        stateVersion
      )
    );
  }

  async readPricesFromContract(
    paramsProvider: ContractParamsProvider,
    stateVersion?: number
  ) {
    if (this.readMode === "ReadFromStorage") {
      const priceData = await this.readPriceData(stateVersion);

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

  async readTimestampFromContract(feedId?: string, stateVersion?: number) {
    if (this.readMode === "ReadFromStorage") {
      const priceData = await this.readPriceData(stateVersion);

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
    feedId?: string,
    stateVersion?: number
  ): Promise<number | undefined> {
    const priceData = await this.readPriceData(stateVersion);

    return priceData[feedId!].lastBlockTimestampMS;
  }

  async readContractData(
    feedIds: string[],
    stateVersion?: number
  ): Promise<ContractData> {
    if (this.readMode === "ReadFromStorage") {
      const priceData = await this.readPriceData(stateVersion);

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

  private async readPriceData(stateVersion?: number): Promise<ContractData> {
    const priceMap: {
      [p: string]: [BigNumberish, BigNumberish, BigNumberish];
    } = await this.client.readValue(this.componentId, "prices", stateVersion);

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
      lastValue: BigNumber.from(data[0]).toBigInt(),
    };
  }

  /// Badges

  async getTrustedUpdaterResourceBadge(accountAddress: string) {
    const resourceAddress: string | undefined = await this.client.readValue(
      this.componentId,
      "trusted_updater_resource"
    );
    if (!resourceAddress) {
      return;
    }

    const accountDataHex = await RadixClient.getAddressDataHex(accountAddress);

    return {
      resourceAddress,
      localId: `<${accountDataHex}>`,
    } as NonFungibleGlobalIdInput;
  }

  private async getTrustedUpdaterProofBadge() {
    this.trustedUpdaterProofBadge ??= await this.makeTrustedUpdaterProofBadge();

    return this.trustedUpdaterProofBadge;
  }

  private async makeTrustedUpdaterProofBadge() {
    const accountAddress = await this.client.getAccountAddress();
    const trustedUpdaterProofBadge =
      await this.getTrustedUpdaterResourceBadge(accountAddress);

    if (!trustedUpdaterProofBadge) {
      return;
    }

    const amount = await this.client.getResourceBalance(
      accountAddress,
      trustedUpdaterProofBadge.resourceAddress
    );
    if (!amount) {
      return;
    }

    return trustedUpdaterProofBadge;
  }
}
