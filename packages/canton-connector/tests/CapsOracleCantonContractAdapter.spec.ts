import { utils } from "@redstone-finance/protocol";
import { keccak256, UniversalSigner } from "@redstone-finance/signing";
import { FP, RedstoneCommon } from "@redstone-finance/utils";
import { CantonClient, CantonContractAdapterConfig, DamlFeedData, JsonCantonApi } from "../src";
import { CapsAdapterPlugin } from "../src/adapters/CapsAdapterPlugin";
import {
  CapsOracleCantonContractAdapter,
  PUBLISH_CHOICE,
} from "../src/adapters/CapsOracleCantonContractAdapter";
import { CapsStateCantonContractAdapter } from "../src/adapters/CapsStateCantonContractAdapter";
import { CantonTrafficMeter } from "../src/tx/CantonTrafficMeter";
import { getCantonFeedId } from "../src/utils/conversions";
import {
  activeContract,
  ALL_FEED_IDS,
  makeParamsProvider,
  spyOnContractUpdate,
  TX_HASH,
} from "./test-helpers";
import { ResetableCantonTrafficMeter } from "./tx/resetable-canton-traffic-meter";

const UPDATER_PARTY_ID = "RedStoneOracleUpdater::1220ab";
const VIEWER_PARTY_ID = "RedStoneOracleViewer::1220ab";
const ORACLE_ID = "oracle-1";
const ORACLE_PACKAGE_ID = "#caps-redstone-oracle";
const ORACLE_TEMPLATE_ID = `${ORACLE_PACKAGE_ID}:RedStoneCapsOracle:RedStoneCapsOracle`;
const DEFINITION = "definition-1";
const OTHER_DEFINITION = "definition-2";
const LICENSE = "license-1";
const CONFIG = {
  viewerPartyId: VIEWER_PARTY_ID,
  updaterPartyId: UPDATER_PARTY_ID,
  adapterId: DEFINITION,
  maxTxSendAttempts: 1,
  expectedTxDeliveryTimeInMs: 1000,
  uniqueSignerThreshold: 1,
  shouldAccumulateTraffic: true,
  useConstTrafficMeter: false,
  totalFeedCount: 2,
};
const FEED_ID = "ETH";
const CURRENT_HEAD = "head-1";
const CURRENT_ROUND_NUMBER = 6;
const NEXT_HEAD = "head-2";
const ATTESTATION_PRIVATE_KEY = "1111111111111111111111111111111111111111111111111111111111111111";
const PAYLOAD_ARGUMENT = { feedIds: [getCantonFeedId(FEED_ID)], payloadHex: "abcd" };
const PAID_TRAFFIC_COST = 100;
const COLLECTED_TRAFFIC = 60_000;
const PLUGIN_TRAFFIC_COST = 1500;
const OTHER_PLUGIN_TRAFFIC_COST = 900;
const PLUGIN_ERROR = new Error("plugin crashed");
const TRAFFIC_READ_ERROR = new Error("traffic unavailable");
const ETH_VALUE = "2438.897142";
const ETH_VALUE_RAW = 243_889_714_200n;
const PACKAGE_TIMESTAMP = 1_000;
const WRITE_TIMESTAMP = 2_000;
const STATE_FEED_DATA = [
  [
    getCantonFeedId(FEED_ID),
    [
      {
        priceData: {
          value: ETH_VALUE,
          packageTimestamp: PACKAGE_TIMESTAMP.toString(),
          writeTimestamp: WRITE_TIMESTAMP.toString(),
        },
      },
    ],
  ],
] as DamlFeedData;

describe("CapsOracleCantonContractAdapter", () => {
  beforeEach(ResetableCantonTrafficMeter.resetAccumulatingInstance);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("publishes on the current round head with the oracle license", async () => {
    const { sut, exerciseChoice } = makeAdapter();

    await sut.exerciseWritePricesChoice(UPDATER_PARTY_ID, PAYLOAD_ARGUMENT);

    expect(exerciseChoice).toHaveBeenCalledWith(
      UPDATER_PARTY_ID,
      {
        templateId: ORACLE_TEMPLATE_ID,
        contractId: ORACLE_ID,
        choice: PUBLISH_CHOICE,
        choiceArgument: {
          roundHead: CURRENT_HEAD,
          license: LICENSE,
          ...PAYLOAD_ARGUMENT,
          attestation: undefined,
        },
      },
      expect.any(Date)
    );
  });

  it("attests the next round and the payload commitment as the verifier recomputes them", async () => {
    const { sut, exerciseChoice } = buildAdapter({
      ...CONFIG,
      privateKey: ATTESTATION_PRIVATE_KEY,
    });
    const dataHash = utils.hexlifyWithout0xPrefix(keccak256(PAYLOAD_ARGUMENT.payloadHex));
    const message = keccak256(
      RedstoneCommon.toUtf8Bytes(
        `caps-round-attestation-v1|${CURRENT_ROUND_NUMBER + 1}|${dataHash}`
      )
    );

    await sut.exerciseWritePricesChoice(UPDATER_PARTY_ID, PAYLOAD_ARGUMENT);
    const [[, { choiceArgument }]] = exerciseChoice.mock.calls;

    expect(choiceArgument).toEqual(
      expect.objectContaining({
        attestation: utils.hexlifyWithout0xPrefix(
          UniversalSigner.signDigestDer(message, `0x${ATTESTATION_PRIVATE_KEY}`)
        ),
      })
    );
  });

  it("leaves the traffic collected in the relayer to the plugins", async () => {
    const { sut, trafficMeter } = makeAdapter();
    trafficMeter.addPaidTrafficCost(COLLECTED_TRAFFIC);

    await sut.exerciseWritePricesChoice(UPDATER_PARTY_ID, PAYLOAD_ARGUMENT);

    expect(trafficMeter.consumeAccumulated()).toBe(COLLECTED_TRAFFIC);
  });

  it("returns the round head created by the publication", async () => {
    const { sut } = makeAdapter();

    const { result } = await sut.exerciseWritePricesChoice(UPDATER_PARTY_ID, PAYLOAD_ARGUMENT);

    expect(result).toBe(NEXT_HEAD);
  });

  it("finds the oracle of the manifest definition signed by the operator through the oracle package", async () => {
    const { sut, getActiveTemplateContractsData } = makeAdapter();

    await sut.exerciseWritePricesChoice(UPDATER_PARTY_ID, PAYLOAD_ARGUMENT);
    const [[actAs, templateId, filter]] = getActiveTemplateContractsData.mock.calls;

    expect([
      actAs,
      templateId,
      filter?.({ definition: DEFINITION }, [UPDATER_PARTY_ID]),
      filter?.({ definition: DEFINITION }, [VIEWER_PARTY_ID]),
      filter?.({ definition: OTHER_DEFINITION }, [UPDATER_PARTY_ID]),
    ]).toEqual([VIEWER_PARTY_ID, ORACLE_TEMPLATE_ID, true, false, false]);
  });

  it("writes all feeds of the relayer", async () => {
    const { sut } = makeAdapter();
    const updateContract = spyOnContractUpdate();

    await sut.writePricesFromPayloadToContract(makeParamsProvider([FEED_ID]), {
      allFeedIds: ALL_FEED_IDS,
    });
    const [[, writtenParamsProvider]] = updateContract.mock.calls;

    expect(writtenParamsProvider.getDataFeedIds()).toEqual(ALL_FEED_IDS);
  });

  it("reads the feed data of the CAPS state", async () => {
    const { sut } = makeAdapter();
    jest
      .spyOn(CapsStateCantonContractAdapter.prototype, "readFeedData")
      .mockResolvedValue(STATE_FEED_DATA);

    const data = await sut.readContractData([FEED_ID]);

    expect(data).toEqual({
      [FEED_ID]: {
        lastDataPackageTimestampMS: PACKAGE_TIMESTAMP,
        lastBlockTimestampMS: WRITE_TIMESTAMP,
        lastValue: ETH_VALUE_RAW,
      },
    });
  });

  it("collects the traffic paid by every plugin in the meter it hands the plugins", async () => {
    spyOnContractUpdate();
    const { sut, trafficMeter } = makeAdapter(
      { run: jest.fn().mockResolvedValue(PLUGIN_TRAFFIC_COST) },
      { run: jest.fn().mockResolvedValue(OTHER_PLUGIN_TRAFFIC_COST) }
    );

    await sut.writePricesFromPayloadToContract(makeParamsProvider([FEED_ID]));
    await waitForBackgroundPlugins();

    expect(trafficMeter.consumeAccumulated()).toBe(PLUGIN_TRAFFIC_COST + OTHER_PLUGIN_TRAFFIC_COST);
  });

  it("collects the traffic of the other plugins when one plugin fails", async () => {
    spyOnContractUpdate();
    const { sut, trafficMeter } = makeAdapter(
      { run: jest.fn().mockRejectedValue(PLUGIN_ERROR) },
      { run: jest.fn().mockResolvedValue(OTHER_PLUGIN_TRAFFIC_COST) }
    );

    await sut.writePricesFromPayloadToContract(makeParamsProvider([FEED_ID]));
    await waitForBackgroundPlugins();

    expect(trafficMeter.consumeAccumulated()).toBe(OTHER_PLUGIN_TRAFFIC_COST);
  });

  it("returns the written contract when a plugin fails", async () => {
    spyOnContractUpdate();
    const { sut } = makeAdapter({ run: jest.fn().mockRejectedValue(PLUGIN_ERROR) });

    const contractId = await sut.writePricesFromPayloadToContract(makeParamsProvider([FEED_ID]));

    expect(contractId).toBe(TX_HASH.generic);
  });

  it("runs no plugin when the write fails", async () => {
    spyOnContractUpdate().mockResolvedValue(FP.err(["write failed"]));
    const { sut, trafficMeter } = makeAdapter({
      run: jest.fn().mockResolvedValue(PLUGIN_TRAFFIC_COST),
    });

    await expect(
      sut.writePricesFromPayloadToContract(makeParamsProvider([FEED_ID]))
    ).rejects.toThrow();

    expect(trafficMeter.consumeAccumulated()).toBe(0);
  });

  function makeAdapter(...plugins: CapsAdapterPlugin[]) {
    const adapter = buildAdapter(CONFIG, plugins);
    const [trafficMeter] = adapter.pluginMeters;

    return { ...adapter, trafficMeter };
  }

  function buildAdapter(config: CantonContractAdapterConfig, plugins: CapsAdapterPlugin[] = []) {
    const pluginMeters: CantonTrafficMeter[] = [];
    const client = new CantonClient(new JsonCantonApi("http://localhost:7575"));
    jest.spyOn(client, "getTotalConsumedTraffic").mockRejectedValue(TRAFFIC_READ_ERROR);
    const getActiveTemplateContractsData = jest
      .spyOn(client, "getActiveTemplateContractsData")
      .mockResolvedValue([activeContract(ORACLE_ID, { definition: DEFINITION, license: LICENSE })]);
    jest
      .spyOn(client, "getActiveContractsData")
      .mockResolvedValue([
        activeContract(CURRENT_HEAD, { roundNumber: CURRENT_ROUND_NUMBER.toString() }),
      ]);
    const exerciseChoice = jest.spyOn(client, "exerciseChoice").mockResolvedValue({
      result: { head: NEXT_HEAD },
      metadata: { paidTrafficCost: PAID_TRAFFIC_COST },
    });

    return {
      sut: new CapsOracleCantonContractAdapter(client, config, (trafficMeter) => {
        pluginMeters.push(trafficMeter);

        return plugins;
      }),
      pluginMeters,
      getActiveTemplateContractsData,
      exerciseChoice,
    };
  }

  async function waitForBackgroundPlugins() {
    await new Promise((resolve) => setImmediate(resolve));
  }
});
