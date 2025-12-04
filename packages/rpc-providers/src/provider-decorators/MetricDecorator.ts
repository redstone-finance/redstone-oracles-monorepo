import { BlockTag, TransactionRequest } from "@ethersproject/abstract-provider";
import { TelemetryPoint } from "@redstone-finance/internal-utils";
import { sanitizeLogMessage } from "@redstone-finance/utils";
import { providers } from "ethers";
import { Deferrable } from "ethers/lib/utils";
import { getProviderNetworkInfo, ReportMetricFn } from "../common";

export function CallMetricDecorator(
  factory: () => providers.Provider,
  reportMetric: ReportMetricFn
) {
  const newFactory = () => {
    const provider = factory();
    const { chainId, url } = getProviderNetworkInfo(provider);

    const oldCall = provider.call.bind(provider);
    provider.call = async (transaction: Deferrable<TransactionRequest>, blockTag?: BlockTag) => {
      const start = performance.now();
      let isFailure = false;
      try {
        const result = await oldCall(transaction, blockTag);
        isFailure = result === "0x";
        return result;
      } catch (e) {
        isFailure = true;
        throw e;
      } finally {
        const end = performance.now();
        const point = createTelemetryPoint("call", chainId, url, isFailure, end - start);
        reportMetric(point);
      }
    };
    return provider;
  };

  return newFactory;
}

export function GetBlockNumberMetricDecorator(
  factory: () => providers.Provider,
  reportMetric: ReportMetricFn
) {
  const newFactory = () => {
    const provider = factory();

    const { chainId, url } = getProviderNetworkInfo(provider);
    const oldGetBlockNumber = provider.getBlockNumber.bind(provider);
    provider.getBlockNumber = async () => {
      const start = performance.now();
      let isFailure = false;
      let blockNumber = -1;

      try {
        const result = await oldGetBlockNumber();
        blockNumber = result;
        return result;
      } catch (e) {
        isFailure = true;
        throw e;
      } finally {
        const end = performance.now();
        const point = createTelemetryPoint("getBlockNumber", chainId, url, isFailure, end - start);
        point.floatField("blockNumber", blockNumber);
        reportMetric(point);
      }
    };
    return provider;
  };

  return newFactory;
}

function createTelemetryPoint(
  op: string,
  chainId: number,
  url: string,
  isFailure: boolean,
  duration: number
): TelemetryPoint {
  return new TelemetryPoint("rpc_provider")
    .tag("op", op)
    .tag("chainId", chainId.toString())
    .tag("url", sanitizeLogMessage(url))
    .tag("isFailure", isFailure.toString())
    .floatField("duration", duration);
}
