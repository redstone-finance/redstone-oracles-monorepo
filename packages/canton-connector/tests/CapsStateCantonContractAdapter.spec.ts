import { CantonClient, JsonCantonApi } from "../src";
import { CapsStateCantonContractAdapter } from "../src/adapters/CapsStateCantonContractAdapter";
import contracts from "../src/canton-defs.json";
import { CAPSULE_INTERFACE } from "../src/utils/capsule-utils";
import { getCantonFeedId } from "../src/utils/conversions";
import { ActiveContract } from "../src/utils/utils";
import { activeContract, spyOnFilteredActiveContracts } from "./test-helpers";

const Defs = contracts.devnet;
const VIEWER_PARTY_ID = "RedStoneOracleViewer::1220ab";
const OPERATOR_PARTY_ID = "RedStoneOracleUpdater::1220ab";
const FORGER_PARTY_ID = "Forger::1220cd";
const ADAPTER_ID = "definition-1";
const OTHER_ADAPTER_ID = "definition-2";
const STATE_TEMPLATE_ID = `${Defs.capsOracleId}:RedStoneCapsOracleState:RedStoneCapsOracleState`;
const CAPSULE_INTERFACE_ID = `${Defs.capsInterfaceId}:${CAPSULE_INTERFACE}`;
const STATE_ID = "state-1";
const FORGED_STATE_ID = "forged-state";
const CAPSULE = "capsule-1";
const FEED_ID = "ETH";
const ETH_VALUE = "2438.897142";
const PUBLISHED_AT = "2026-10-19T10:00:00Z";
const WRITE_TIMESTAMP = "1780000001000";
const OFFSET = 42;
const FEED_DATA = [
  [
    getCantonFeedId(FEED_ID),
    [
      {
        priceData: {
          value: ETH_VALUE,
          packageTimestamp: Date.parse(PUBLISHED_AT).toString(),
          writeTimestamp: WRITE_TIMESTAMP,
        },
      },
    ],
  ],
];

describe("CapsStateCantonContractAdapter", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("builds the feed data from the capsule of the state", async () => {
    const { sut } = makeAdapter(CAPSULE);

    const feedData = await sut.readFeedData();

    expect(feedData).toEqual(FEED_DATA);
  });

  it("reads the capsule of the state at the requested offset", async () => {
    const { sut, getCreatedContractData } = makeAdapter(CAPSULE);

    await sut.readFeedData(OFFSET);

    expect(getCreatedContractData).toHaveBeenCalledWith(
      VIEWER_PARTY_ID,
      CAPSULE_INTERFACE_ID,
      CAPSULE,
      undefined,
      OFFSET
    );
  });

  it("looks up only the state of the adapter", async () => {
    const { sut, getActiveTemplateContractsData } = makeAdapter(CAPSULE);

    await sut.readFeedData();
    const [[actAs, templateId, filter]] = getActiveTemplateContractsData.mock.calls;

    expect([
      actAs,
      templateId,
      filter?.({ adapterId: ADAPTER_ID }, [OPERATOR_PARTY_ID]),
      filter?.({ adapterId: OTHER_ADAPTER_ID }, [OPERATOR_PARTY_ID]),
    ]).toEqual([VIEWER_PARTY_ID, STATE_TEMPLATE_ID, true, false]);
  });

  it("reads the operator's state when another party signed a state of the same adapter", async () => {
    const { sut } = makeAdapter(CAPSULE, [
      activeContract(
        FORGED_STATE_ID,
        { adapterId: ADAPTER_ID, capsule: null, writeTimestamp: WRITE_TIMESTAMP },
        { signatories: [FORGER_PARTY_ID] }
      ),
    ]);

    expect(await sut.readFeedData()).toEqual(FEED_DATA);
  });

  it("returns no feed data before the first write", async () => {
    const { sut } = makeAdapter(null);

    const feedData = await sut.readFeedData();

    expect(feedData).toEqual([]);
  });

  function makeAdapter(capsule: string | null, otherContracts: ActiveContract[] = []) {
    const client = new CantonClient(new JsonCantonApi("http://localhost:7575"));
    const getActiveTemplateContractsData = spyOnFilteredActiveContracts(
      client,
      "getActiveTemplateContractsData",
      [
        ...otherContracts,
        activeContract(
          STATE_ID,
          { adapterId: ADAPTER_ID, capsule, writeTimestamp: WRITE_TIMESTAMP },
          { signatories: [OPERATOR_PARTY_ID] }
        ),
      ]
    );
    const getCreatedContractData = jest.spyOn(client, "getCreatedContractData").mockResolvedValue({
      contractId: CAPSULE,
      createArgument: {
        content: {
          dataPoint: {
            publishedAt: PUBLISHED_AT,
            values: { [FEED_ID]: { tag: "AVDecimal", value: ETH_VALUE } },
          },
        },
      },
    });

    return {
      sut: new CapsStateCantonContractAdapter(
        client,
        VIEWER_PARTY_ID,
        ADAPTER_ID,
        OPERATOR_PARTY_ID
      ),
      getActiveTemplateContractsData,
      getCreatedContractData,
    };
  }
});
