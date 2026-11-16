import {
  CantonClient,
  JsonCantonApi,
  makeCantonContractAdapter,
  PricesCantonContractAdapter,
} from "../src";
import { CapsOracleCantonContractAdapter } from "../src/adapters/CapsOracleCantonContractAdapter";
import contracts from "../src/canton-defs.json";
import { ADAPTER_CONFIG, SIGNATORY } from "./test-helpers";

const Defs = contracts.devnet;
const REQUESTED_INTERFACE_ID = "#redstone-interface-requested";
const ADAPTER_CONTRACT_ID = "adapter-1";

describe("makeCantonContractAdapter", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("makes the CAPS oracle adapter for the CAPS oracle package", () => {
    const sut = makeCantonContractAdapter(makeClient().client, ADAPTER_CONFIG, Defs.capsOracleId);

    expect(sut.constructor).toBe(CapsOracleCantonContractAdapter);
  });

  it("makes the prices adapter on the requested interface package", async () => {
    const { client, getActiveContractData } = makeClient();

    const sut = makeCantonContractAdapter(client, ADAPTER_CONFIG, REQUESTED_INTERFACE_ID);
    await sut.fetchContractData(SIGNATORY);
    const [[, interfaceId]] = getActiveContractData.mock.calls;

    expect([sut.constructor, interfaceId]).toEqual([
      PricesCantonContractAdapter,
      `${REQUESTED_INTERFACE_ID}:IRedStoneAdapter:IRedStoneAdapter`,
    ]);
  });

  it("makes the prices adapter on the interface package of the defs by default", async () => {
    const { client, getActiveContractData } = makeClient();

    const sut = makeCantonContractAdapter(client, ADAPTER_CONFIG);
    await sut.fetchContractData(SIGNATORY);
    const [[, interfaceId]] = getActiveContractData.mock.calls;

    expect([sut.constructor, interfaceId]).toEqual([
      PricesCantonContractAdapter,
      `${Defs.interfaceId}:IRedStoneAdapter:IRedStoneAdapter`,
    ]);
  });

  function makeClient() {
    const client = new CantonClient(new JsonCantonApi("http://localhost:7575"));
    const getActiveContractData = jest
      .spyOn(client, "getActiveContractData")
      .mockResolvedValue({ contractId: ADAPTER_CONTRACT_ID, createArgument: {} });

    return { client, getActiveContractData };
  }
});
