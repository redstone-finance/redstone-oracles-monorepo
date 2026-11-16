import { CantonClient, JsonCantonApi } from "../src";
import { CapsPluginCantonContractAdapter } from "../src/adapters/CapsPluginCantonContractAdapter";

interface PendingExecution {
  resolve: (paidTrafficCost: number) => void;
  reject: (error: Error) => void;
}

const OPERATOR_PARTY_ID = "RedStoneOracleUpdater::1220ab";
const NO_INTERVAL_MS = 0;
const PAID_TRAFFIC_COST = 700;
const EXECUTION_ERROR = new Error("archive failed");

describe("CapsPluginCantonContractAdapter", () => {
  let sut: TestPlugin;

  beforeEach(() => {
    sut = new TestPlugin(new CantonClient(new JsonCantonApi("http://localhost:7575")));
  });

  it("skips a run that starts while the previous one is still executing", async () => {
    const firstRun = sut.run();
    const overlappingRun = sut.run();
    sut.finishExecutions(PAID_TRAFFIC_COST);

    expect(await Promise.all([firstRun, overlappingRun])).toEqual([PAID_TRAFFIC_COST, undefined]);
  });

  it("runs again after a failed run", async () => {
    const failedRun = sut.run();
    sut.failExecutions(EXECUTION_ERROR);
    await failedRun;

    const nextRun = sut.run();
    sut.finishExecutions(PAID_TRAFFIC_COST);

    expect(await nextRun).toBe(PAID_TRAFFIC_COST);
  });
});

class TestPlugin extends CapsPluginCantonContractAdapter<object> {
  private pendingExecutions: PendingExecution[] = [];

  constructor(client: CantonClient) {
    super(client, "#test-plugin", "Test.Plugin:Plugin", OPERATOR_PARTY_ID, NO_INTERVAL_MS);
  }

  finishExecutions(paidTrafficCost: number) {
    this.pendingExecutions.forEach(({ resolve }) => resolve(paidTrafficCost));
    this.pendingExecutions = [];
  }

  failExecutions(error: Error) {
    this.pendingExecutions.forEach(({ reject }) => reject(error));
    this.pendingExecutions = [];
  }

  protected execute() {
    return new Promise<number>((resolve, reject) => {
      this.pendingExecutions.push({ resolve, reject });
    });
  }
}
