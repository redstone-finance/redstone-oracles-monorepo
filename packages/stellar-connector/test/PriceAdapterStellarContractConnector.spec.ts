import { makeServer, wasmFilePath } from "../scripts/utils";
import {
  makeKeypair,
  PriceAdapterStellarContractConnector,
  StellarContractDeployer,
  StellarPricesContractAdapter,
  StellarRpcClient,
} from "../src";

const DEPLOY_CONTRACT_TIMEOUT_MS = 20 * 1_000;

describe("PriceAdapterStellarContractConnector", () => {
  let connector: PriceAdapterStellarContractConnector;

  beforeAll(async () => {
    const server = makeServer();
    const keypair = makeKeypair();
    const client = new StellarRpcClient(server);

    const deployer = new StellarContractDeployer(client, keypair);
    const { contractId: adapterId } = await deployer.deploy(
      wasmFilePath("redstone_adapter")
    );

    connector = new PriceAdapterStellarContractConnector(
      client,
      adapterId,
      keypair
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
      expect(adapter).toBeInstanceOf(StellarPricesContractAdapter);
    });
  });
});
