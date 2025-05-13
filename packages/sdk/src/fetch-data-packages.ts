import { RedstoneCommon, RedstoneTypes } from "@redstone-finance/utils";
import { resolveDataServiceUrls } from "./data-services-urls";

/** Fetches data-packages from gateway */
type FetchDataPackagesArgs = {
  dataServiceId: string;
  gatewayUrls?: string[];
  getMetadata?: boolean;
};

export const fetchDataPackages = async ({
  dataServiceId,
  gatewayUrls,
  getMetadata,
}: FetchDataPackagesArgs): Promise<RedstoneTypes.DataPackageFromGatewayResponse> => {
  const resolvedGatewayUrls =
    gatewayUrls ?? resolveDataServiceUrls(dataServiceId);

  const urls = resolvedGatewayUrls.map(
    (baseUrl) =>
      `${baseUrl}/v2/data-packages/latest/${dataServiceId}${getMetadata ? "/show-metadata" : ""}`
  );

  const responseFromGateway =
    await RedstoneCommon.fetchWithFallbacks<RedstoneTypes.DataPackageFromGatewayResponse>(
      { urls }
    );

  return responseFromGateway.data;
};
