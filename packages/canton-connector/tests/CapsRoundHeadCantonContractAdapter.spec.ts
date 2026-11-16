import { CantonClient, JsonCantonApi } from "../src";
import { CapsRoundHeadCantonContractAdapter } from "../src/adapters/CapsRoundHeadCantonContractAdapter";
import { activeContract, spyOnFilteredActiveContracts } from "./test-helpers";

const UPDATER_PARTY_ID = "RedStoneOracleUpdater::1220ab";
const VIEWER_PARTY_ID = "RedStoneOracleViewer::1220ab";
const DEFINITION = "definition-1";
const OTHER_DEFINITION = "definition-2";
const HEAD_ID = "head-1";
const ROUND_NUMBER = 6;
const HEAD_CREATED_AT = "2026-11-09T10:00:00Z";

describe("CapsRoundHeadCantonContractAdapter", () => {
  let client: CantonClient;

  beforeEach(() => {
    client = new CantonClient(new JsonCantonApi("http://localhost:7575"));
    spyOnFilteredActiveContracts(client, "getActiveContractsData", [
      activeContract(
        HEAD_ID,
        { definition: DEFINITION, roundNumber: ROUND_NUMBER.toString() },
        { signatories: [UPDATER_PARTY_ID], createdAt: HEAD_CREATED_AT }
      ),
      activeContract(
        "head-of-other-definition",
        { definition: OTHER_DEFINITION, roundNumber: ROUND_NUMBER.toString() },
        { signatories: [UPDATER_PARTY_ID] }
      ),
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("with a signatory other than the acting party", () => {
    let sut: CapsRoundHeadCantonContractAdapter;

    beforeEach(() => {
      sut = new CapsRoundHeadCantonContractAdapter(
        client,
        VIEWER_PARTY_ID,
        DEFINITION,
        UPDATER_PARTY_ID
      );
    });

    it("reads the round head of the definition signed by the signatory", async () => {
      expect(await sut.readRoundHead()).toEqual({
        id: HEAD_ID,
        roundNumber: ROUND_NUMBER,
        createdAtMs: Date.parse(HEAD_CREATED_AT),
      });
    });
  });

  describe("without a signatory", () => {
    let sut: CapsRoundHeadCantonContractAdapter;

    beforeEach(() => {
      sut = new CapsRoundHeadCantonContractAdapter(client, VIEWER_PARTY_ID, DEFINITION);
    });

    it("expects the acting party to sign the round head", async () => {
      await expect(sut.readRoundHead()).rejects.toThrow("Expected one round head, found 0");
    });
  });
});
