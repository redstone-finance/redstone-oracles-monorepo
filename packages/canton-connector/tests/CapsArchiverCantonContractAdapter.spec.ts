import { RedstoneCommon } from "@redstone-finance/utils";
import { CantonClient, JsonCantonApi } from "../src";
import { CapsArchiverCantonContractAdapter } from "../src/adapters/CapsArchiverCantonContractAdapter";
import { CapsCapsuleCantonContractAdapter } from "../src/adapters/CapsCapsuleCantonContractAdapter";
import { CapsRoundHead, CAPSULE_INTERFACE } from "../src/utils/capsule-utils";
import {
  CAPS_ARCHIVE_INTERVAL_MS,
  CAPS_ARCHIVE_PAID_TRAFFIC_COST,
  CAPS_ARCHIVER_ID,
  CAPS_DEFINITION,
  CAPS_KEEP_PERIOD_MICROSECONDS,
  CAPS_OLD_AGE_MS,
  CAPS_OPERATOR_PARTY_ID,
  CAPS_ROUND_HEAD_CREATED_AT_MS,
  CAPS_ROUND_HEAD_ID,
  makeCapsContract,
  spyOnCapsArchiverLedger,
} from "./test-helpers";

const PACKAGE_ID = "#caps-test-archiver";
const TEMPLATE_NAME = "Caps.TestArchiver:TestArchiver";
const ARCHIVE_CHOICE = "TestArchiver_Archive";
const ARCHIVED_NAME = "capsule";
const KEEP_PERIOD_MS = RedstoneCommon.microsecsToMs(CAPS_KEEP_PERIOD_MICROSECONDS);
const LOCAL_CLOCK_AHEAD_MS = 3_600_000;
const CAPSULE_AGES_MS = [90_000, 61_000, KEEP_PERIOD_MS, 30_000, 0];

describe("CapsArchiverCantonContractAdapter", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("archives the contracts created longer than the keep period before the round head", async () => {
    const { sut, exerciseChoices } = makeAdapter(CAPSULE_AGES_MS);

    await sut.run();
    const [[, [command]]] = exerciseChoices.mock.calls;

    expect(command).toEqual({
      templateId: `${PACKAGE_ID}:${TEMPLATE_NAME}`,
      contractId: CAPS_ARCHIVER_ID,
      choice: ARCHIVE_CHOICE,
      choiceArgument: archiveArgument([capsuleId(1), capsuleId(2)]),
    });
  });

  it("keeps the contracts of the newest kept rounds whatever their age", async () => {
    const { sut, exerciseChoices } = makeAdapter([0, 0, CAPS_OLD_AGE_MS, CAPS_OLD_AGE_MS, 0]);

    await sut.run();
    const [[, [command]]] = exerciseChoices.mock.calls;

    expect(command.choiceArgument).toEqual(archiveArgument([capsuleId(3)]));
  });

  it("measures the age of a contract against the round head and not the local clock", async () => {
    const { sut, exerciseChoices } = makeAdapter(CAPSULE_AGES_MS);
    jest.spyOn(Date, "now").mockReturnValue(CAPS_ROUND_HEAD_CREATED_AT_MS + LOCAL_CLOCK_AHEAD_MS);

    await sut.run();
    const [[, [command]]] = exerciseChoices.mock.calls;

    expect(command.choiceArgument).toEqual(archiveArgument([capsuleId(1), capsuleId(2)]));
  });

  it("returns the traffic paid by the archiving", async () => {
    const { sut } = makeAdapter(CAPSULE_AGES_MS);

    expect(await sut.run()).toBe(CAPS_ARCHIVE_PAID_TRAFFIC_COST);
  });

  it("pays nothing when no contract is stale", async () => {
    const { sut } = makeAdapter([0, 0, 0]);

    expect(await sut.run()).toBeUndefined();
  });

  function makeAdapter(capsuleAgesMs: number[]) {
    const client = new CantonClient(new JsonCantonApi("http://localhost:7575"));
    const exerciseChoices = spyOnCapsArchiverLedger(
      client,
      CAPSULE_INTERFACE,
      capsuleAgesMs.map((ageMs, index) => makeCapsContract(capsuleId(index + 1), index + 1, ageMs)),
      capsuleAgesMs.length
    );

    return { sut: new TestCapsArchiverCantonContractAdapter(client), exerciseChoices };
  }

  function archiveArgument(capsules: string[]) {
    return { actor: CAPS_OPERATOR_PARTY_ID, roundHead: CAPS_ROUND_HEAD_ID, capsules };
  }

  function capsuleId(roundNumber: number) {
    return `capsule-${roundNumber}`;
  }
});

class TestCapsArchiverCantonContractAdapter extends CapsArchiverCantonContractAdapter {
  private readonly capsuleAdapter: CapsCapsuleCantonContractAdapter;

  constructor(client: CantonClient) {
    super(
      client,
      PACKAGE_ID,
      TEMPLATE_NAME,
      CAPS_OPERATOR_PARTY_ID,
      CAPS_ARCHIVE_INTERVAL_MS,
      CAPS_DEFINITION,
      ARCHIVE_CHOICE,
      ARCHIVED_NAME
    );

    this.capsuleAdapter = new CapsCapsuleCantonContractAdapter(
      client,
      CAPS_OPERATOR_PARTY_ID,
      CAPS_DEFINITION
    );
  }

  protected readStaleIds(roundHead: CapsRoundHead, keptRounds: number, keepPeriodMs: number) {
    return this.capsuleAdapter.readStaleCapsuleIds(roundHead, keptRounds, keepPeriodMs);
  }
}
