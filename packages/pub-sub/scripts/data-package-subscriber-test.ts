import { getSignersForDataServiceId } from "@redstone-finance/sdk";
import { DataPackageSubscriber, PooledMqttClient, createMqtt5ClientFactory } from "../src";
import { calculateTopicCountPerConnection } from "../src/topics";

const ENDPOINT = "a263ekd4nmsrss-ats.iot.eu-west-1.amazonaws.com";

async function main() {
  const multiClient = new PooledMqttClient(
    createMqtt5ClientFactory({
      endpoint: ENDPOINT,
      authorization: {
        type: "AWSSigV4",
      },
    }),
    calculateTopicCountPerConnection(),
    ENDPOINT
  );

  const dataPackageSubscriber = new DataPackageSubscriber(multiClient, {
    dataServiceId: "redstone-primary-prod",
    dataPackageIds: [
      "BTC",
      "USDC",
      "USDT",
      "WBTC",
      "ARB",
      "SolvBTC_MERLIN",
      "ETH",
      "pufETH",
      "STONE",
      "MANTA",
      "ezETH",
      "ZKL",
      "GHO",
    ],
    uniqueSignersCount: 2,
    minimalOffChainSignersCount: 3,
    waitMsForOtherSignersAfterMinimalSignersCountSatisfied: 100,
    ignoreMissingFeeds: true,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  await dataPackageSubscriber.subscribe(() => {});
}

void main();
