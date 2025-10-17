import { TimestampMqttDataProcessingStrategy } from "../../src/runner/strategy/TimestampMqttDataProcessingStrategy";
import { BTC_DATA_POINT, ETH_DATA_POINT, later, LATER_TS, USDT_DATA_POINT } from "./mock-utils";
import { testMqttDataProcessingStrategy } from "./test-mqtt-data-processing.strategy";

testMqttDataProcessingStrategy(
  "Timestamp Mqtt Data Processing Strategy",
  (cache) => new TimestampMqttDataProcessingStrategy<void>(cache),
  (performTest) => {
    /// Differences

    it("Should handle consequent executions with newer data", async () => {
      await performTest(
        [[ETH_DATA_POINT], [BTC_DATA_POINT], [later(ETH_DATA_POINT)], [later(BTC_DATA_POINT)]],
        [[ETH_DATA_POINT], [later(ETH_DATA_POINT), later(BTC_DATA_POINT)]]
      );
    });

    it("Should handle consequent executions with newer and delayed data", async () => {
      await performTest(
        [
          [ETH_DATA_POINT],
          [BTC_DATA_POINT],
          [later(ETH_DATA_POINT)],
          [USDT_DATA_POINT],
          [later(BTC_DATA_POINT)],
        ],
        [[ETH_DATA_POINT], [later(ETH_DATA_POINT), later(BTC_DATA_POINT)], [USDT_DATA_POINT]]
      );
    });

    it("Should handle consequent executions with replaced multiple data", async () => {
      await performTest(
        [
          [ETH_DATA_POINT, BTC_DATA_POINT],
          [later(ETH_DATA_POINT), later(USDT_DATA_POINT)],
          [later(USDT_DATA_POINT, 2 * LATER_TS), later(ETH_DATA_POINT, 2 * LATER_TS)],
          [later(BTC_DATA_POINT, 2 * LATER_TS)],
        ],
        [
          [ETH_DATA_POINT, BTC_DATA_POINT],
          [
            later(USDT_DATA_POINT, 2 * LATER_TS),
            later(ETH_DATA_POINT, 2 * LATER_TS),
            later(BTC_DATA_POINT, 2 * LATER_TS),
          ],
        ]
      );
    });
  }
);
