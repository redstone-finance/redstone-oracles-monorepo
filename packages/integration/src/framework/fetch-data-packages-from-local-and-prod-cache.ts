import axios from "axios";
import axiosRetry from "axios-retry";
import { DataPackages } from "./compare-data-packages";
import { GatewayInstance, getCacheServiceUrl } from "./gateway-manager";

axiosRetry(axios, {
  retries: 2,
  retryCondition: (error) => {
    return axios.isAxiosError(error) && error.response?.status === 513;
  },
  retryDelay: (retryCount) => {
    console.log("513 - Retry attempt: ", retryCount);
    return retryCount * 500;
  },
});

const HISTORICAL_ORACLE_GATEWAY_URL = process.env.HISTORICAL_ORACLE_GATEWAY_URL;

export const fetchDataPackagesFromCaches = async (
  gatewayInstance: GatewayInstance,
  timestamp: number,
  manifestFileName: string
) => {
  const responseFromLocalCache = (
    await axios.get<DataPackages>(
      `${getCacheServiceUrl(
        gatewayInstance,
        "direct"
      )}/data-packages/historical/mock-data-service/${timestamp}`
    )
  ).data;
  let responseFromProdCache: DataPackages | undefined;
  const prodDataServiceName = manifestFileName.replace("data-services/", "");
  try {
    responseFromProdCache = (
      await axios.get<DataPackages>(
        `${HISTORICAL_ORACLE_GATEWAY_URL}/data-packages/historical/redstone-${prodDataServiceName}-prod/${timestamp}`,
        {
          validateStatus: function (status) {
            return status === 200;
          },
        }
      )
    ).data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Prod cache response code:",
        error.response?.status,
        " For timestamp ",
        timestamp
      );
    }
    throw error;
  }
  return { responseFromLocalCache, responseFromProdCache, timestamp };
};
