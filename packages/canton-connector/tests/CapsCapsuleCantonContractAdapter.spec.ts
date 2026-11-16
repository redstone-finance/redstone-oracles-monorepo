import { CantonClient, JsonCantonApi } from "../src";
import { CapsCapsuleCantonContractAdapter } from "../src/adapters/CapsCapsuleCantonContractAdapter";
import contracts from "../src/canton-defs.json";
import { ActiveContract } from "../src/utils/utils";
import { activeContract, spyOnFilteredActiveContracts } from "./test-helpers";

const Defs = contracts.devnet;
const CAPSULE_INTERFACE_ID = `${Defs.capsInterfaceId}:Caps.Api.CoreV1:Capsule`;
const OPERATOR_PARTY_ID = "RedStoneOracleUpdater::1220ab";
const DEFINITION = "definition-1";
const OTHER_DEFINITION = "definition-2";
const CAPSULE_ID = "capsule-1";
const NEXT_CAPSULE_ID = "capsule-2";
const OFFSET = 42;
const KEPT_ROUNDS = 1;
const KEEP_PERIOD_MS = 60_000;
const OLD_AGE_MS = 120_000;
const NEWEST_CREATED_AT = "2026-11-09T10:00:00Z";
const NEWEST_CREATED_AT_MS = Date.parse(NEWEST_CREATED_AT);
const DATA_POINT = { publishedAt: NEWEST_CREATED_AT, values: {} };
const ROUND_HEAD = { id: "head-1", roundNumber: 2, createdAtMs: NEWEST_CREATED_AT_MS };
const LATER_ROUND_HEAD = {
  id: "head-2",
  roundNumber: 4,
  createdAtMs: NEWEST_CREATED_AT_MS + OLD_AGE_MS,
};

describe("CapsCapsuleCantonContractAdapter", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns the stale capsules of its definition", async () => {
    const { sut } = makeAdapter([
      capsule(CAPSULE_ID, DEFINITION, 1, OLD_AGE_MS),
      capsule(NEXT_CAPSULE_ID, DEFINITION, 2, 0),
      capsule("capsule-of-other-definition", OTHER_DEFINITION, 1, OLD_AGE_MS),
    ]);

    expect(await sut.readStaleCapsuleIds(ROUND_HEAD, KEPT_ROUNDS, KEEP_PERIOD_MS)).toEqual([
      CAPSULE_ID,
    ]);
  });

  it("measures the staleness against the round head and not the newest capsule read", async () => {
    const { sut } = makeAdapter([
      capsule(CAPSULE_ID, DEFINITION, 1, 0),
      capsule(NEXT_CAPSULE_ID, DEFINITION, 2, 0),
    ]);

    expect(await sut.readStaleCapsuleIds(LATER_ROUND_HEAD, KEPT_ROUNDS, KEEP_PERIOD_MS)).toEqual([
      CAPSULE_ID,
      NEXT_CAPSULE_ID,
    ]);
  });

  it("returns the data point of the capsule at the offset", async () => {
    const { sut, getCreatedContractData } = makeAdapter([]);

    const dataPoint = await sut.readDataPoint(CAPSULE_ID, OFFSET);

    expect([dataPoint, getCreatedContractData.mock.calls]).toEqual([
      DATA_POINT,
      [[OPERATOR_PARTY_ID, CAPSULE_INTERFACE_ID, CAPSULE_ID, undefined, OFFSET]],
    ]);
  });

  it("fails when the capsule is not found", async () => {
    const { sut, getCreatedContractData } = makeAdapter([]);
    getCreatedContractData.mockResolvedValue(undefined);

    await expect(sut.readDataPoint(CAPSULE_ID)).rejects.toThrow(`Capsule ${CAPSULE_ID} not found`);
  });

  function makeAdapter(capsules: ActiveContract[]) {
    const client = new CantonClient(new JsonCantonApi("http://localhost:7575"));
    spyOnFilteredActiveContracts(client, "getActiveContractsData", capsules);
    const getCreatedContractData = jest.spyOn(client, "getCreatedContractData").mockResolvedValue({
      contractId: CAPSULE_ID,
      createArgument: { content: { dataPoint: DATA_POINT } },
    });

    return {
      sut: new CapsCapsuleCantonContractAdapter(client, OPERATOR_PARTY_ID, DEFINITION),
      getCreatedContractData,
    };
  }

  function capsule(contractId: string, definition: string, roundNumber: number, ageMs: number) {
    return activeContract(
      contractId,
      { definition, roundNumber: roundNumber.toString() },
      {
        signatories: [OPERATOR_PARTY_ID],
        createdAt: new Date(NEWEST_CREATED_AT_MS - ageMs).toISOString(),
      }
    );
  }
});
