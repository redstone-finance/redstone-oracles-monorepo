import { CantonClient, JsonCantonApi } from "../src/client/CantonClient";
import { SIGNATORY } from "./test-helpers";

const PARTY = "RedStoneOracleViewer::1220ab";
const INTERFACE_ID = "#redstone-interface-v19:IRedStoneAdapter:IRedStoneAdapter";
const CONTRACT_ID = "cid-1";

const response = (createdAtOffset: number, archivedAtOffset?: number) => ({
  created: {
    createdEvent: {
      contractId: CONTRACT_ID,
      offset: createdAtOffset,
      createArgument: { adapterId: "RedStoneAdapter-v19-0.4.0" },
      signatories: [SIGNATORY],
      createdEventBlob: "blob",
    },
    synchronizerId: "global-domain::1220ab",
  },
  ...(archivedAtOffset === undefined
    ? {}
    : { archived: { archivedEvent: { offset: archivedAtOffset }, synchronizerId: "x" } }),
});

const makeClient = (result: object) => {
  const api = new JsonCantonApi("http://localhost:7575");
  jest.spyOn(api, "performRequestCollected").mockResolvedValue(result);

  return new CantonClient(api);
};

const read = (result: object, atOffset?: number) =>
  makeClient(result).getCreatedContractData(PARTY, INTERFACE_ID, CONTRACT_ID, undefined, atOffset);

describe("CantonClient.getCreatedContractData", () => {
  it("returns the contract when it is active now", async () => {
    await expect(read(response(1000))).resolves.toMatchObject({ contractId: CONTRACT_ID });
  });

  it("returns nothing when the contract is archived and no offset is given", async () => {
    await expect(read(response(1000, 1200))).resolves.toBeUndefined();
  });

  it("returns nothing when the contract did not exist yet at the requested offset", async () => {
    await expect(read(response(1000), 900)).resolves.toBeUndefined();
  });

  it("returns the contract when it was already created at the requested offset", async () => {
    await expect(read(response(1000), 1000)).resolves.toMatchObject({ contractId: CONTRACT_ID });
  });

  it("returns the contract when it was archived only after the requested offset", async () => {
    await expect(read(response(500, 900), 800)).resolves.toMatchObject({
      contractId: CONTRACT_ID,
    });
  });

  it("returns nothing when the contract was already archived at the requested offset", async () => {
    await expect(read(response(500, 900), 900)).resolves.toBeUndefined();
  });

  it("returns nothing when the contract does not match the filter", async () => {
    const client = makeClient(response(1000));

    await expect(
      client.getCreatedContractData(PARTY, INTERFACE_ID, CONTRACT_ID, () => false)
    ).resolves.toBeUndefined();
  });
});
