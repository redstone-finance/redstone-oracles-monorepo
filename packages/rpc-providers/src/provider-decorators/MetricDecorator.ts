import { BlockTag, TransactionRequest } from "@ethersproject/abstract-provider";
import { TelemetryPoint } from "@redstone-finance/internal-utils";
import { sanitizeLogMessage } from "@redstone-finance/utils";
import { BigNumber, providers } from "ethers";
import { Deferrable } from "ethers/lib/utils";
import { getProviderNetworkInfo, ReportMetricFn } from "../common";

type FeeHistoryResponse = { reward: string[] };

export function CallMetricDecorator(
  factory: () => providers.Provider,
  reportMetric: ReportMetricFn
) {
  const newFactory = () => {
    const provider = factory();
    const { chainId, url } = getProviderNetworkInfo(provider);

    const oldCall = provider.call.bind(provider);
    provider.call = async (transaction: Deferrable<TransactionRequest>, blockTag?: BlockTag) =>
      await timeMethod(
        () => oldCall(transaction, blockTag),
        reportMetric,
        (duration, isFailure, result) => {
          isFailure = isFailure || result === "0x";
          const point = createTelemetryPoint("call", chainId, url, isFailure, duration);
          return point;
        }
      );

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
    provider.getBlockNumber = async () =>
      await timeMethod(
        () => oldGetBlockNumber(),
        reportMetric,
        (duration, isFailure, result) => {
          const point = createTelemetryPoint("blockNumber", chainId, url, isFailure, duration);
          point.floatField("blockNumber", isFailure ? 0 : Number(result));
          return point;
        }
      );

    return provider;
  };

  return newFactory;
}

const methodsToCollectTelemetryFrom = [
  "eth_estimateGas",
  "eth_blockNumber",
  "eth_maxPriorityFeePerGas",
  "eth_call",
  "eth_feeHistory",
];

export function SendMetricDecorator(
  factory: () => providers.Provider,
  reportMetric: ReportMetricFn
) {
  const newFactory = () => {
    const provider = factory();
    const { chainId, url } = getProviderNetworkInfo(provider);
    // send doesn't exist in providers.Provider only in providers that inherit from it (eg. JsonRpcProvider)
    if ("send" in provider && typeof provider.send === "function") {
      const oldSend = provider.send.bind(provider) as (
        method: string,
        params: Array<unknown> | Record<string, unknown>
      ) => Promise<unknown>;
      provider.send = async (method: string, params: unknown[]) =>
        !methodsToCollectTelemetryFrom.includes(method)
          ? await oldSend(method, params)
          : await timeMethod(
              () => oldSend(method, params),
              reportMetric,
              (duration, isFailure, result) => {
                const point = createTelemetryPoint(
                  method.replace("eth_", ""),
                  chainId,
                  url,
                  isFailure,
                  duration
                );
                if (
                  method === "eth_estimateGas" ||
                  method === "eth_blockNumber" ||
                  method === "eth_maxPriorityFeePerGas"
                ) {
                  point.floatField(
                    method.replace("eth_", ""),
                    isFailure ? 0 : parseInt((result as BigNumber).toString())
                  );
                } else if (method === "eth_call") {
                  point.tag(
                    "isFailure",
                    isFailure ? String(true) : ((result as string) === "0x").toString()
                  );
                } else if (method === "eth_feeHistory") {
                  if (!isFailure && (result as FeeHistoryResponse).reward.length > 0) {
                    const rewardsPerBlockForPercentile = (result as FeeHistoryResponse).reward
                      .flat()
                      .map((hex: string) => parseInt(hex, 16));
                    const maxRewardsPerBlockForPercentile = Math.max(
                      ...rewardsPerBlockForPercentile
                    );
                    point.floatField(
                      "maxRewardsPerBlockForPercentile",
                      maxRewardsPerBlockForPercentile
                    );
                  }
                }
                return point;
              }
            );
    }
    return provider;
  };
  return newFactory;
}

async function timeMethod<T>(
  fn: () => Promise<T>,
  reportMetric: ReportMetricFn,
  pointCreator: (duration: number, isFailure: boolean, result: unknown) => TelemetryPoint
): Promise<T> {
  const start = performance.now();
  let result: T | undefined;
  let isFailure = false;

  try {
    result = await fn();
    return result;
  } catch (e) {
    isFailure = true;
    throw e;
  } finally {
    const duration = performance.now() - start;
    reportMetric(pointCreator(duration, isFailure, result));
  }
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
