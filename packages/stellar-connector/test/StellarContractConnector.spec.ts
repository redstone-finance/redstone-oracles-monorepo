import { RedstoneCommon } from "@redstone-finance/utils";
import { Keypair, rpc } from "@stellar/stellar-sdk";
import { z } from "zod";
import { loadAdapterId } from "../scripts/utils";
import {
  StellarContractAdapter,
  StellarPriceAdapterContractConnector,
} from "../src";

describe("StellarContractConnector", () => {
  let connector: StellarPriceAdapterContractConnector;

  beforeAll(() => {
    const rpcUrl = RedstoneCommon.getFromEnv("RPC_URL", z.string().url());
    const server = new rpc.Server(rpcUrl, { allowHttp: true });

    const privateKey = RedstoneCommon.getFromEnv("PRIVATE_KEY", z.string());
    const keypair = Keypair.fromSecret(privateKey);

    const adapterId = loadAdapterId();

    connector = new StellarPriceAdapterContractConnector(
      server,
      keypair,
      adapterId
    );
  });

  describe("getBlockNumber", () => {
    it("should get block number", async () => {
      const result = await connector.getBlockNumber();
      expect(result).toBeGreaterThan(10);
    });
  });

  describe("getAdapter", () => {
    it("should return adapter", async () => {
      const adapter = await connector.getAdapter();
      expect(adapter).toBeInstanceOf(StellarContractAdapter);
    });
  });
});
