import { CantonClient, JsonCantonApi } from "../src";
import { WRITE_PRICES_CHOICE } from "../src/adapters/PricesCantonContractAdapter";
import contracts from "../src/canton-defs.json";
import { CantonTxLookup, PUBLISH_CHOICE } from "../src/CantonTxLookup";

const Defs = contracts.devnet;
const UPDATER_PARTY_ID = "RedStoneOracleUpdater::1220ab";
const ADAPTER_CONTRACT = "definition-1";
const START_BLOCK = 10;
const END_BLOCK = 20;

describe("CantonTxLookup", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("looks up the oracle publications through the oracle template for the CAPS oracle package", async () => {
    const { sut, getTransactionsForTemplate } = makeLookup();

    await fetchManifestPage(sut, Defs.capsOracleId);

    expect(getTransactionsForTemplate).toHaveBeenCalledWith(
      UPDATER_PARTY_ID,
      `${Defs.capsOracleId}:RedStoneCapsOracle:RedStoneCapsOracle`,
      START_BLOCK,
      END_BLOCK,
      PUBLISH_CHOICE
    );
  });

  it("looks up the price writes through the adapter interface for an interface package", async () => {
    const { sut, getTransactionsForInterface } = makeLookup();

    await fetchManifestPage(sut, Defs.interfaceId);

    expect(getTransactionsForInterface).toHaveBeenCalledWith(
      UPDATER_PARTY_ID,
      `${Defs.interfaceId}:IRedStoneAdapter:IRedStoneAdapter`,
      START_BLOCK,
      END_BLOCK,
      WRITE_PRICES_CHOICE
    );
  });

  function makeLookup() {
    const client = new CantonClient(new JsonCantonApi("http://localhost:7575"));
    const getTransactionsForTemplate = jest
      .spyOn(client, "getTransactionsForTemplate")
      .mockResolvedValue([]);
    const getTransactionsForInterface = jest
      .spyOn(client, "getTransactionsForInterface")
      .mockResolvedValue([]);

    return {
      sut: new CantonTxLookup(client, UPDATER_PARTY_ID),
      getTransactionsForTemplate,
      getTransactionsForInterface,
    };
  }

  async function fetchManifestPage(sut: CantonTxLookup, adapterContractPackageId: string) {
    return await sut.fetchPage({
      manifests: [
        { adapterContract: ADAPTER_CONTRACT, adapterContractPackageId, walletAddresses: [] },
      ],
      startBlock: START_BLOCK,
      endBlock: END_BLOCK,
    });
  }
});
