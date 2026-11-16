import { CantonClient, JsonCantonApi } from "../src";
import { CapsRoundCantonContractAdapter } from "../src/adapters/CapsRoundCantonContractAdapter";
import { activeContract, spyOnFilteredActiveContracts } from "./test-helpers";

const OPERATOR_PARTY_ID = "RedStoneOracleUpdater::1220ab";
const DEFINITION = "definition-1";
const OTHER_DEFINITION = "definition-2";
const STALE_ROUND_ID = "round-1";
const KEPT_ROUNDS = 1;
const KEEP_PERIOD_MS = 60_000;
const OLD_AGE_MS = 120_000;
const NEWEST_CREATED_AT_MS = Date.parse("2026-11-09T10:00:00Z");
const ROUND_HEAD = { id: "head-1", roundNumber: 2, createdAtMs: NEWEST_CREATED_AT_MS };

describe("CapsRoundCantonContractAdapter", () => {
  let sut: CapsRoundCantonContractAdapter;

  beforeEach(() => {
    const client = new CantonClient(new JsonCantonApi("http://localhost:7575"));
    spyOnFilteredActiveContracts(client, "getActiveContractsData", [
      round("round-0", DEFINITION, 0, OLD_AGE_MS),
      round(STALE_ROUND_ID, DEFINITION, 1, OLD_AGE_MS),
      round("round-2", DEFINITION, 2, 0),
      round("round-of-other-definition", OTHER_DEFINITION, 1, OLD_AGE_MS),
    ]);
    sut = new CapsRoundCantonContractAdapter(client, OPERATOR_PARTY_ID, DEFINITION);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns the stale rounds of its definition and never the genesis round", async () => {
    expect(await sut.readStaleRoundIds(ROUND_HEAD, KEPT_ROUNDS, KEEP_PERIOD_MS)).toEqual([
      STALE_ROUND_ID,
    ]);
  });

  function round(contractId: string, definition: string, roundNumber: number, ageMs: number) {
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
