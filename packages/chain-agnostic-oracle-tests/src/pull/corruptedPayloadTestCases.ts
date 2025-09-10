import { basicPullModelTestConfig } from "../common";

const REDSTONE_MARKER_HEX = "000002ed57011e0000";

// Assertion just in case someone tries to change the basic test config
if (!basicPullModelTestConfig.expectedSuccess) {
  throw new Error(`Basic test should describe successful path`);
}

export const corruptedPayloadTestCases = {
  "Should work with valid payload": basicPullModelTestConfig,
  "No redstone marker in the end should revert": {
    ...basicPullModelTestConfig,
    expectedSuccess: false,
    payloadGenerator: (timestamp: number) => {
      const originalPayload = basicPullModelTestConfig.payloadGenerator(timestamp);
      if (!originalPayload.endsWith(REDSTONE_MARKER_HEX)) {
        throw new Error(
          `Expected to get a payload with redstone marker in the end. Got: ${originalPayload}`
        );
      }
      return originalPayload.slice(0, REDSTONE_MARKER_HEX.length);
    },
  },
};
