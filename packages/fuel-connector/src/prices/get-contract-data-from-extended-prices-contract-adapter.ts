import { BigNumber } from "@ethersproject/bignumber";
import { LegacyPricesContractAdapter } from "@redstone-finance/multichain-kit-legacy";
import {
  ContractData,
  ContractParamsProvider,
  DataPackagesRequestParams,
} from "@redstone-finance/sdk";
import { zip } from "lodash";

export async function getContractDataFromExtendedPricesContractAdapter(
  adapter: LegacyPricesContractAdapter,
  feedIds: string[]
) {
  const [timestamp, latestUpdateBlockTimestamp, prices] = await Promise.all([
    adapter.readTimestampFromContract(),
    adapter.readLatestUpdateBlockTimestamp(),
    adapter.readPricesFromContract(
      new ContractParamsProvider({
        dataPackagesIds: feedIds,
      } as unknown as DataPackagesRequestParams)
    ),
  ]);

  const entries = zip(feedIds, prices).map(([feedId, price]) => [
    feedId,
    {
      lastDataPackageTimestampMS: timestamp,
      lastBlockTimestampMS: latestUpdateBlockTimestamp ?? timestamp,
      lastValue: BigNumber.from(price),
    },
  ]);

  return Object.fromEntries(entries) as ContractData;
}
