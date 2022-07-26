import { TwapFetcher } from "./TwapFetcher";
import allSupportedProvidersForTwap from "./all-supported-providers-for-twap.json";

const fetchersObj: { [name: string]: TwapFetcher } = {};

for (const providerDetails of allSupportedProvidersForTwap) {
  const twapFetcherInstance = new TwapFetcher(providerDetails.id);
  fetchersObj[twapFetcherInstance.getName()] = twapFetcherInstance;
}

export default fetchersObj;
