import _ from "lodash";

export type LastRoundDetails = {
  lastDataPackageTimestampMS: number;
  lastBlockTimestampMS: number;
  lastValue: bigint;
};

export type ContractData = {
  [dataFeedsId: string]: LastRoundDetails;
};

export function getLastRoundDetails(
  contractData: ContractData,
  dataFeedId: string,
  updateBaseObject = false
): LastRoundDetails {
  let lastRoundDetails = contractData[dataFeedId];
  if (_.isEmpty(lastRoundDetails)) {
    lastRoundDetails = {
      lastBlockTimestampMS: 0,
      lastDataPackageTimestampMS: 0,
      lastValue: 0n,
    };

    if (updateBaseObject) {
      contractData[dataFeedId] = lastRoundDetails;
    }
  }

  return lastRoundDetails;
}
