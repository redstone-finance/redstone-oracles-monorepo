import { LastRoundDetails } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import _ from "lodash";
import { StellarClient } from "../stellar/StellarClient";
import { Sep40ContractReader } from "./Sep40ContractReader";
import { StellarContractAdapter } from "./StellarContractAdapter";

export class Sep40StellarContractAdapter extends StellarContractAdapter {
  readonly reader: Sep40ContractReader;

  constructor(client: StellarClient, contract: string) {
    super(client, contract);

    this.reader = new Sep40ContractReader(client, this.contract);
  }

  async getDataFeedIds(blockNumber?: number) {
    return await this.reader.getDataFeedIds(blockNumber);
  }

  protected override async getContractData(feedIds: string[], blockNumber?: number) {
    const promises = feedIds.map((feedId) => this.reader.readLatestData(feedId, blockNumber));
    const latestData = await Promise.allSettled(promises);

    const data = latestData.map((result, index) => {
      if (result.status === "rejected" || !RedstoneCommon.isDefined(result.value)) {
        StellarContractAdapter.logger.warn(
          `Couldn't find SEP-40 data for ${feedIds[index]} ${RedstoneCommon.stringify(result)}`
        );

        return undefined;
      }

      const timestampMS = RedstoneCommon.secsToMs(result.value.timestamp);
      return {
        lastDataPackageTimestampMS: timestampMS,
        lastBlockTimestampMS: timestampMS,
        lastValue: result.value.price,
      };
    });

    return _.zip(feedIds, data) as [string, LastRoundDetails | undefined][];
  }
}
