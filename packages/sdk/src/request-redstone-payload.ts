import {
  RedstonePayload,
  type SignedDataPackage,
} from "@redstone-finance/protocol";
import {
  requestDataPackages,
  type DataPackagesRequestParams,
} from "./request-data-packages";
import type { DataPackagesResponse } from "./request-data-packages-common";

export const convertDataPackagesResponse = (
  signedDataPackagesResponse: DataPackagesResponse,
  format = "hex",
  unsignedMetadataMsg?: string
) => {
  const signedDataPackages = Object.values(
    signedDataPackagesResponse
  ).flat() as SignedDataPackage[];

  const payload = new RedstonePayload(
    signedDataPackages,
    unsignedMetadataMsg ?? ""
  );

  switch (format) {
    case "json":
      return JSON.stringify(payload.toObj(), null, 2);
    case "bytes":
      return JSON.stringify(Array.from(payload.toBytes()));
    default:
      return payload.toBytesHexWithout0xPrefix();
  }
};

export const requestRedstonePayload = async (
  reqParams: DataPackagesRequestParams,
  format = "hex",
  unsignedMetadataMsg?: string
): Promise<string> => {
  const signedDataPackagesResponse = await requestDataPackages(reqParams);

  return convertDataPackagesResponse(
    signedDataPackagesResponse,
    format,
    unsignedMetadataMsg
  );
};
