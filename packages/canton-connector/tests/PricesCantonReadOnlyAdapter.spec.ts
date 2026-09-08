import { PricesCantonReadOnlyAdapter } from "../src/adapters/PricesCantonReadOnlyAdapter";
import { CantonClient } from "../src/client/CantonClient";
import { PRICE_ADAPTER_ID, SIGNATORY } from "./test-helpers";

const VIEWER_PARTY_ID = "RedStoneOracleViewer::1220ab";
const CONFIG = {
  adapterId: PRICE_ADAPTER_ID,
  viewerPartyId: VIEWER_PARTY_ID,
  uniqueSignerThreshold: 1,
};

const contractData = (contractId: string) => ({
  contractId,
  synchronizerId: "global-domain::1220ab",
  createArgument: { adapterId: PRICE_ADAPTER_ID, feedData: [] },
});

const makeAdapter = () => {
  const getActiveContractData = jest.fn();
  const getCreatedContractData = jest.fn();
  const client = {
    getDefs: () => ({
      signatory: SIGNATORY,
      interfaceId: "#redstone-interface-v19",
      core: { coreId: "RedStoneCore-v19-0.4.0" },
    }),
    getActiveContractData,
    getCreatedContractData,
  } as unknown as CantonClient;

  return {
    adapter: new PricesCantonReadOnlyAdapter(client, CONFIG),
    getActiveContractData,
    getCreatedContractData,
  };
};

describe("PricesCantonReadOnlyAdapter", () => {
  it("resolves the adapter contract from the active contract set once, then reads it by id", async () => {
    const { adapter, getActiveContractData, getCreatedContractData } = makeAdapter();
    getActiveContractData.mockResolvedValue(contractData("cid-1"));
    getCreatedContractData.mockResolvedValue(contractData("cid-1"));

    await adapter.readContractData([]);
    await adapter.readContractData([]);
    await adapter.readContractData([]);

    expect(getActiveContractData).toHaveBeenCalledTimes(1);
    expect(getCreatedContractData).toHaveBeenCalledTimes(2);
    expect(getCreatedContractData).toHaveBeenLastCalledWith(
      VIEWER_PARTY_ID,
      "#redstone-interface-v19:IRedStoneAdapter:IRedStoneAdapter",
      "cid-1",
      expect.any(Function),
      undefined
    );
  });

  it("asks for the contract as of the requested offset", async () => {
    const { adapter, getActiveContractData, getCreatedContractData } = makeAdapter();
    getActiveContractData.mockResolvedValue(contractData("cid-1"));
    getCreatedContractData.mockResolvedValue(undefined);

    await adapter.readContractData([], 1000);
    await adapter.readContractData([], 900);

    expect(getCreatedContractData).toHaveBeenCalledWith(
      VIEWER_PARTY_ID,
      expect.any(String),
      "cid-1",
      expect.any(Function),
      900
    );
    // the cached contract is not active at that offset, so the read falls back to the ACS
    expect(getActiveContractData).toHaveBeenLastCalledWith(
      VIEWER_PARTY_ID,
      expect.any(String),
      expect.any(Function),
      900
    );
  });

  it("falls back to the active contract set when the known contract is gone", async () => {
    const { adapter, getActiveContractData, getCreatedContractData } = makeAdapter();
    getActiveContractData.mockResolvedValueOnce(contractData("cid-1"));
    getActiveContractData.mockResolvedValueOnce(contractData("cid-2"));
    getCreatedContractData.mockResolvedValueOnce(undefined);
    getCreatedContractData.mockResolvedValue(contractData("cid-2"));

    await adapter.readContractData([]);
    await adapter.readContractData([]); // cid-1 archived -> rescan, caches cid-2
    await adapter.readContractData([]);

    expect(getActiveContractData).toHaveBeenCalledTimes(2);
    expect(getCreatedContractData).toHaveBeenLastCalledWith(
      VIEWER_PARTY_ID,
      expect.any(String),
      "cid-2",
      expect.any(Function),
      undefined
    );
  });
});
