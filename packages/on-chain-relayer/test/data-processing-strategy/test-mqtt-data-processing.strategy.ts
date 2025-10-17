import { DataPackagesResponse, DataPackagesResponseCache } from "@redstone-finance/sdk";
import { expect } from "chai";
import sinon from "sinon";
import { MqttDataProcessingStrategy } from "../../src/runner/strategy/MqttDataProcessingStrategy";
import {
  BTC_DATA_POINT,
  DataPackagesResponseInput,
  ETH_DATA_POINT,
  later,
  LATER_TS,
  makeDataPackagesResponse,
  mockRequestParams,
  MockStrategyDelegate,
  SINGLE_RUN_MS,
  USDT_DATA_POINT,
} from "./mock-utils";

export function testMqttDataProcessingStrategy(
  strategyName: string,
  createStrategy: (cache: DataPackagesResponseCache) => MqttDataProcessingStrategy<void>,
  otherTests: (
    performTest: (
      inputs: DataPackagesResponseInput[][],
      expectedInputs?: DataPackagesResponseInput[][],
      requestParams?: typeof mockRequestParams
    ) => Promise<void>
  ) => void
) {
  describe(strategyName, () => {
    let clock: sinon.SinonFakeTimers;
    let delegate: MockStrategyDelegate;
    let facadeCache: DataPackagesResponseCache;
    let sut: MqttDataProcessingStrategy<void>;

    beforeEach(() => {
      clock = sinon.useFakeTimers();

      facadeCache = new DataPackagesResponseCache();
      delegate = new MockStrategyDelegate();

      sut = createStrategy(facadeCache);
      sut.delegate = new WeakRef(delegate);
    });

    afterEach(() => {
      clock.restore();
    });

    describe(`${strategyName} - common`, () => {
      it("Should handle single execution", async () => {
        await performTest([[ETH_DATA_POINT, BTC_DATA_POINT]]);
      });

      it("Should handle consequent executions", async () => {
        await performTest([[ETH_DATA_POINT], [BTC_DATA_POINT]]);
      });

      it("Should handle consequent executions with replaced multiple data with different set", async () => {
        await performTest([
          [ETH_DATA_POINT, BTC_DATA_POINT],
          [later(ETH_DATA_POINT), later(USDT_DATA_POINT)],
          [
            later(USDT_DATA_POINT, 2 * LATER_TS),
            later(BTC_DATA_POINT, 2 * LATER_TS),
            later(ETH_DATA_POINT, 2 * LATER_TS),
          ],
        ]);
      });

      it("Should handle consequent executions with unwanted feedId", async () => {
        await performTest([[ETH_DATA_POINT], [USDT_DATA_POINT]], [[ETH_DATA_POINT], []], {
          ...mockRequestParams,
          dataPackagesIds: ["ETH"],
        });
      });

      it("Should handle consequent executions with multiple data", async () => {
        await performTest([
          [ETH_DATA_POINT, BTC_DATA_POINT],
          [later(ETH_DATA_POINT), later(USDT_DATA_POINT)],
          [later(USDT_DATA_POINT, 2 * LATER_TS), later(BTC_DATA_POINT, 2 * LATER_TS)],
        ]);
      });
    });

    describe(`${strategyName} - differences`, () => {
      otherTests(performTest);
    });

    async function performTest(
      inputs: DataPackagesResponseInput[][],
      expectedInputs?: DataPackagesResponseInput[][],
      requestParams?: typeof mockRequestParams
    ) {
      const params = requestParams ?? mockRequestParams;

      const responses = inputs.map(makeDataPackagesResponse);
      const expectedResponses = (expectedInputs ?? inputs).map(makeDataPackagesResponse);

      responses.forEach((response: DataPackagesResponse) => {
        sut.processResponse(undefined, params, response);
      });

      for (const response of expectedResponses) {
        const result = facadeCache.get(params);
        expect(result).to.deep.equal(response);
        await clock.tickAsync(SINGLE_RUN_MS);
      }
    }
  });
}
