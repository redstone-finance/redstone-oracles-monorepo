import type { DeviationsPerDataFeed } from "./run-long-price-propagation-core-test";

export const checkValuesDeviations = (
  deviationsPerDataFeed: DeviationsPerDataFeed,
  maxPercentageValueDifference: number
) => {
  let deviationsBiggerThanAllowed = 0;
  const dataFeeds = Object.keys(deviationsPerDataFeed);
  for (const dataFeedId of dataFeeds) {
    const deviation = deviationsPerDataFeed[dataFeedId];
    if (deviation > maxPercentageValueDifference) {
      console.log(
        `Value deviation for ${dataFeedId} is bigger than maximum (${maxPercentageValueDifference}%) - ${deviation}%`
      );
      deviationsBiggerThanAllowed += 1;
    }
  }

  if (deviationsBiggerThanAllowed > 0) {
    throw new Error(
      `Found deviations bigger than maximum ${maxPercentageValueDifference}%`
    );
  }
};
