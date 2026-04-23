import {
  ContractParamsProvider,
  DataPackagesRequestParams,
  DataPackagesResponseCache,
} from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { WriteContractAdapter } from "./WriteContractAdapter";

async function prepareParamsProviderWithData(requestParams: DataPackagesRequestParams) {
  const cache = new DataPackagesResponseCache();
  const paramsProvider = new ContractParamsProvider(requestParams, cache);
  const data = await paramsProvider.requestDataPackages();
  cache.update(data, requestParams);

  return paramsProvider;
}

export async function writeSimultaneously(
  requestParams: DataPackagesRequestParams,
  adapter: WriteContractAdapter
) {
  const dataServiceIdInterval = RedstoneCommon.secsToMs(10);

  const paramsProvider = await prepareParamsProviderWithData(requestParams);
  await RedstoneCommon.sleep(dataServiceIdInterval + RedstoneCommon.secsToMs(1));
  const paramsProvider2 = await prepareParamsProviderWithData(requestParams);
  await RedstoneCommon.sleep(RedstoneCommon.secsToMs(3));

  await Promise.allSettled(
    [paramsProvider2, paramsProvider].map((paramsProvider) =>
      adapter.writePricesFromPayloadToContract(paramsProvider)
    )
  );
}
