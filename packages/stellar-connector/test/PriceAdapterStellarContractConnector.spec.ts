import { makeServer, PRICE_ADAPTER, wasmFilePath } from "../scripts/utils";
import {
  makeKeypair,
  PriceAdapterStellarContractAdapter,
  PriceAdapterStellarContractConnector,
  StellarContractDeployer,
  StellarRpcClient,
  StellarTxDeliveryMan,
} from "../src";

const DEPLOY_CONTRACT_TIMEOUT_MS = 20 * 1_000;

describe("PriceAdapterStellarContractConnector", () => {
  let connector: PriceAdapterStellarContractConnector;

  beforeAll(async () => {
    const server = makeServer();
    const keypair = makeKeypair();
    const client = new StellarRpcClient(server);
    const txDeliveryMan = new StellarTxDeliveryMan(client, keypair);

    const deployer = new StellarContractDeployer(client, txDeliveryMan);
    const { contractId: adapterId } = await deployer.deploy(
      wasmFilePath(PRICE_ADAPTER)
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
      expect(adapter).toBeInstanceOf(PriceAdapterStellarContractAdapter);
    });
  });
});
