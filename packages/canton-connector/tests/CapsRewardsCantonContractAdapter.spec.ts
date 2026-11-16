import { CantonClient, DEFS_KEY_FEATURED_APP_RIGHT, JsonCantonApi } from "../src";
import { CapsRewardsCantonContractAdapter } from "../src/adapters/CapsRewardsCantonContractAdapter";
import contracts from "../src/canton-defs.json";
import { RealCantonTrafficMeter } from "../src/tx/RealCantonTrafficMeter";
import { ResetableCantonTrafficMeter } from "./tx/resetable-canton-traffic-meter";

const Defs = contracts.devnet;
const OPERATOR_PARTY_ID = "RedStoneOracleUpdater::1220ab";
const OTHER_PARTY_ID = "RedStoneOracleViewer::1220ab";
const FACTORY_ID = "reward-factory-1";
const REWARDS_INTERVAL_MS = 420_000;
const COLLECTED_TRAFFIC = 60_000;
const PAID_TRAFFIC_COST = 700;
const REWARD_WEIGHT = "3.795";
const NO_REWARD_WEIGHT = "0.0";
const SEND_ERROR = new Error("CONTRACT_NOT_FOUND");
const LOOKUP_ERROR = new Error("No active contract data");

describe("CapsRewardsCantonContractAdapter", () => {
  beforeEach(ResetableCantonTrafficMeter.resetAccumulatingInstance);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("sends the traffic collected in the relayer to the reward factory", async () => {
    const { sut, exerciseChoices } = makeAdapter();

    await sut.run();
    const [[actAs, [command], , disclosedContracts]] = exerciseChoices.mock.calls;

    expect([actAs, command, disclosedContracts]).toEqual([
      OPERATOR_PARTY_ID,
      {
        templateId: `${Defs.interfaceId}:IRedStoneRewardFactory:IRedStoneRewardFactory`,
        contractId: FACTORY_ID,
        choice: "CreateRewards",
        choiceArgument: { caller: OPERATOR_PARTY_ID, count: COLLECTED_TRAFFIC.toString() },
      },
      [Defs[DEFS_KEY_FEATURED_APP_RIGHT]],
    ]);
  });

  it("returns the traffic paid by the sending", async () => {
    const { sut } = makeAdapter();

    expect(await sut.run()).toBe(PAID_TRAFFIC_COST);
  });

  it("takes the sent traffic out of the meter when the factory creates rewards", async () => {
    const { sut, trafficMeter } = makeAdapter();

    await sut.run();

    expect(trafficMeter.consumeAccumulated()).toBe(0);
  });

  it("keeps the collected traffic in the meter when the factory creates no rewards", async () => {
    const { sut, exerciseChoices, trafficMeter } = makeAdapter();
    exerciseChoices.mockResolvedValue({
      results: { [FACTORY_ID]: NO_REWARD_WEIGHT },
      metadata: { paidTrafficCost: PAID_TRAFFIC_COST },
    });

    await sut.run();

    expect(trafficMeter.consumeAccumulated()).toBe(COLLECTED_TRAFFIC);
  });

  it("keeps the collected traffic in the meter when Canton rejects the sending", async () => {
    const { sut, exerciseChoices, trafficMeter } = makeAdapter();
    exerciseChoices.mockRejectedValue(SEND_ERROR);

    await sut.run();

    expect(trafficMeter.consumeAccumulated()).toBe(COLLECTED_TRAFFIC);
  });

  it("returns no traffic when the sending fails", async () => {
    const { sut, exerciseChoices } = makeAdapter();
    exerciseChoices.mockRejectedValue(SEND_ERROR);

    expect(await sut.run()).toBeUndefined();
  });

  it("sends nothing when no traffic is collected", async () => {
    const { sut } = makeAdapter(0);

    expect(await sut.run()).toBeUndefined();
  });

  it("keeps the collected traffic in the meter when the reward factory is not found", async () => {
    const { sut, getActiveContractData, trafficMeter } = makeAdapter();
    getActiveContractData.mockRejectedValue(LOOKUP_ERROR);

    await sut.run();

    expect(trafficMeter.consumeAccumulated()).toBe(COLLECTED_TRAFFIC);
  });

  it("finds the reward factory of the defs owner that lists the operator among its creators", async () => {
    const { sut, getActiveContractData } = makeAdapter();

    await sut.run();
    const [[actAs, interfaceId, filter]] = getActiveContractData.mock.calls;

    expect([
      actAs,
      interfaceId,
      filter?.({ creators: [OPERATOR_PARTY_ID] }, [Defs.signatory]),
      filter?.({ creators: [OTHER_PARTY_ID] }, [Defs.signatory]),
      filter?.({ creators: [OPERATOR_PARTY_ID] }, [OPERATOR_PARTY_ID]),
    ]).toEqual([
      OPERATOR_PARTY_ID,
      `${Defs.interfaceId}:IRedStoneRewardFactory:IRedStoneRewardFactory`,
      true,
      false,
      false,
    ]);
  });

  function makeAdapter(collectedTraffic = COLLECTED_TRAFFIC) {
    const client = new CantonClient(new JsonCantonApi("http://localhost:7575"));
    const trafficMeter = new RealCantonTrafficMeter(true, () => Promise.resolve(0));
    trafficMeter.addPaidTrafficCost(collectedTraffic);
    const getActiveContractData = jest
      .spyOn(client, "getActiveContractData")
      .mockResolvedValue({ contractId: FACTORY_ID, createArgument: {} });
    const exerciseChoices = jest.spyOn(client, "exerciseChoices").mockResolvedValue({
      results: { [FACTORY_ID]: REWARD_WEIGHT },
      metadata: { paidTrafficCost: PAID_TRAFFIC_COST },
    });

    return {
      sut: new CapsRewardsCantonContractAdapter(
        client,
        OPERATOR_PARTY_ID,
        REWARDS_INTERVAL_MS,
        trafficMeter
      ),
      trafficMeter,
      getActiveContractData,
      exerciseChoices,
    };
  }
});
