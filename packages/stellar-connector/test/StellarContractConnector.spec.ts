import { RedstoneCommon } from "@redstone-finance/utils";
import { Keypair, rpc } from "@stellar/stellar-sdk";
import { z } from "zod";
import { wasmFilePath } from "../scripts/utils";
import {
  ContractDeployer,
  StellarContractAdapter,
  StellarPriceAdapterContractConnector,
} from "../src";

const DEPLOY_CONTRACT_TIMEOUT_MS = 20 * 1_000;

describe("StellarContractConnector", () => {
  let connector: StellarPriceAdapterContractConnector;

  beforeAll(async () => {
    const rpcUrl = RedstoneCommon.getFromEnv("RPC_URL", z.string().url());
    const server = new rpc.Server(rpcUrl, { allowHttp: true });

    const privateKey = RedstoneCommon.getFromEnv("PRIVATE_KEY", z.string());
    const keypair = Keypair.fromSecret(privateKey);

    const deployer = new ContractDeployer(server, keypair);
    const { contractId: adapterId } = await deployer.deploy(
      wasmFilePath("redstone_adapter")
    );

    connector = new StellarPriceAdapterContractConnector(
      server,
      keypair,
      adapterId
    );
  }, DEPLOY_CONTRACT_TIMEOUT_MS);

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
