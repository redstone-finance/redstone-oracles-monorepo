import type { DeviationsPerDataFeed } from "./run-long-price-propagation-core-test";

export const printAllDeviations = (
  deviationsPerDataFeed: DeviationsPerDataFeed,
  isBigPackage: boolean = false
) => {
  const dataFeeds = Object.keys(deviationsPerDataFeed);
  for (const dataFeedId of dataFeeds) {
    const deviation = deviationsPerDataFeed[dataFeedId];
    logDeviation(dataFeedId, deviation, isBigPackage);
  }
};

const logDeviation = (
  dataFeedId: string,
  deviation: number,
  isBigPackage: boolean
) => {
  console.log(
    `Max deviation${
      isBigPackage ? " from big package" : ""
    } for ${dataFeedId} - ${deviation}`
  );
};
