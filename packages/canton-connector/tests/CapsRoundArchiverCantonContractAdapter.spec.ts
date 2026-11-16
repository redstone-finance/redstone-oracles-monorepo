import { CantonClient, JsonCantonApi } from "../src";
import { CapsRoundArchiverCantonContractAdapter } from "../src/adapters/CapsRoundArchiverCantonContractAdapter";
import contracts from "../src/canton-defs.json";
import { ROUND_INTERFACE } from "../src/utils/capsule-utils";
import {
  CAPS_ARCHIVE_INTERVAL_MS,
  CAPS_ARCHIVER_ID,
  CAPS_DEFINITION,
  CAPS_OLD_AGE_MS,
  CAPS_OPERATOR_PARTY_ID,
  CAPS_ROUND_HEAD_ID,
  makeCapsContract,
  spyOnCapsArchiverLedger,
} from "./test-helpers";

const Defs = contracts.devnet;
const STALE_ROUND_ID = "round-1";
const HEAD_ROUND_NUMBER = 3;

describe("CapsRoundArchiverCantonContractAdapter", () => {
  let sut: CapsRoundArchiverCantonContractAdapter;
  let exerciseChoices: jest.SpiedFunction<CantonClient["exerciseChoices"]>;

  beforeEach(() => {
    const client = new CantonClient(new JsonCantonApi("http://localhost:7575"));
    exerciseChoices = spyOnCapsArchiverLedger(
      client,
      ROUND_INTERFACE,
      [
        makeCapsContract("round-0", 0, CAPS_OLD_AGE_MS),
        makeCapsContract(STALE_ROUND_ID, 1, CAPS_OLD_AGE_MS),
        makeCapsContract("round-2", 2, 0),
      ],
      HEAD_ROUND_NUMBER
    );
    sut = new CapsRoundArchiverCantonContractAdapter(
      client,
      CAPS_OPERATOR_PARTY_ID,
      CAPS_ARCHIVE_INTERVAL_MS,
      CAPS_DEFINITION
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("archives the stale rounds but the genesis one with the round archiver choice", async () => {
    await sut.run();
    const [[, [command]]] = exerciseChoices.mock.calls;

    expect(command).toEqual({
      templateId: `${Defs.capsRoundArchiverId}:Caps.RoundArchiver:RoundArchiver`,
      contractId: CAPS_ARCHIVER_ID,
      choice: "RoundArchiver_Archive",
      choiceArgument: {
        actor: CAPS_OPERATOR_PARTY_ID,
        roundHead: CAPS_ROUND_HEAD_ID,
        rounds: [STALE_ROUND_ID],
      },
    });
  });
});
