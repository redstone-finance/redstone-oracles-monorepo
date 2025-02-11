import { Network } from "@aptos-labs/ts-sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { z } from "zod";
import { MovementNetworkSchema } from "../src";
import { MovementPricesContractAdapter } from "../src/MovementPricesContractAdapter";
import { MovementPricesContractConnector } from "../src/MovementPricesContractConnector";
import { makeAptosVariables } from "../src/utils";

describe("MovementContractConnector", () => {
  let connector: MovementPricesContractConnector;

  beforeAll(() => {
    const network = RedstoneCommon.getFromEnv("NETWORK", MovementNetworkSchema);

    const packageAddress = RedstoneCommon.getFromEnv(
      "PACKAGE_ADDRESS",
      z.optional(z.string())
    );
    const privateKey = RedstoneCommon.getFromEnv(
      "PRIVATE_KEY",
      z.optional(z.string())
    );

    const aptosVariables = makeAptosVariables(
      network as Network,
      packageAddress,
      privateKey
    );
    const args = {
      priceAdapterObjectAddress: packageAddress
        ? packageAddress
        : aptosVariables.account.accountAddress.toString(),
      packageObjectAddress: aptosVariables.account.accountAddress.toString(),
    };
    connector = new MovementPricesContractConnector(
      aptosVariables.client,
      args,
      aptosVariables.account
    );
  });

  describe("getBlockNumber", () => {
    it("should get block number", async () => {
      const result = await connector.getBlockNumber();
      expect(result).toBeGreaterThan(100);
    });
  });

  describe("getAdapter", () => {
    it("should return adapter", async () => {
      const adapter = await connector.getAdapter();
      expect(adapter).toBeInstanceOf(MovementPricesContractAdapter);
    });
  });
});
