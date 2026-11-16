import { CantonClient, JsonCantonApi } from "../src";
import { CapsCapsuleArchiverCantonContractAdapter } from "../src/adapters/CapsCapsuleArchiverCantonContractAdapter";
import contracts from "../src/canton-defs.json";
import { CAPSULE_INTERFACE } from "../src/utils/capsule-utils";
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
const STALE_CAPSULE_ID = "capsule-1";
const HEAD_ROUND_NUMBER = 3;

describe("CapsCapsuleArchiverCantonContractAdapter", () => {
  let sut: CapsCapsuleArchiverCantonContractAdapter;
  let exerciseChoices: jest.SpiedFunction<CantonClient["exerciseChoices"]>;

  beforeEach(() => {
    const client = new CantonClient(new JsonCantonApi("http://localhost:7575"));
    exerciseChoices = spyOnCapsArchiverLedger(
      client,
      CAPSULE_INTERFACE,
      [makeCapsContract(STALE_CAPSULE_ID, 1, CAPS_OLD_AGE_MS), makeCapsContract("capsule-2", 2, 0)],
      HEAD_ROUND_NUMBER
    );
    sut = new CapsCapsuleArchiverCantonContractAdapter(
      client,
      CAPS_OPERATOR_PARTY_ID,
      CAPS_ARCHIVE_INTERVAL_MS,
      CAPS_DEFINITION
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("archives the stale capsules with the capsule archiver choice", async () => {
    await sut.run();
    const [[, [command]]] = exerciseChoices.mock.calls;

    expect(command).toEqual({
      templateId: `${Defs.capsCapsuleArchiverId}:Caps.CapsuleArchiver:CapsuleArchiver`,
      contractId: CAPS_ARCHIVER_ID,
      choice: "CapsuleArchiver_Archive",
      choiceArgument: {
        actor: CAPS_OPERATOR_PARTY_ID,
        roundHead: CAPS_ROUND_HEAD_ID,
        capsules: [STALE_CAPSULE_ID],
      },
    });
  });
});
