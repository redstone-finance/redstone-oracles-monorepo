import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import {
  makeSuiClient,
  makeSuiKeypair,
  readSuiConfig,
  SuiContractConnector,
  SuiNetworkSchema,
} from "../src";
import { GrpcSuiClient } from "../src/GrpcSuiClient";

describe("SuiContractConnector", () => {
  let connector: SuiContractConnector;

  beforeAll(() => {
    const network = RedstoneCommon.getFromEnv("NETWORK", SuiNetworkSchema);

    connector = new SuiContractConnector(
      new GrpcSuiClient(makeSuiClient(network)),
      readSuiConfig(network),
      makeSuiKeypair()
    );
  });

  describe("getBlockNumber", () => {
    it("should get block number", async () => {
      const result = await connector.getBlockNumber();
      expect(result).toBeGreaterThan(10);
    });
  });
});
