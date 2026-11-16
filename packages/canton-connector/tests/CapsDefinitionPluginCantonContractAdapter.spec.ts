import { CantonClient, JsonCantonApi } from "../src";
import { CapsDefinitionPluginCantonContractAdapter } from "../src/adapters/CapsDefinitionPluginCantonContractAdapter";
import { activeContract, spyOnFilteredActiveContracts } from "./test-helpers";

interface TestPluginArgument {
  definition: string;
  paidTrafficCost: string;
}

const OPERATOR_PARTY_ID = "RedStoneOracleUpdater::1220ab";
const DEFINITION = "definition-1";
const OTHER_DEFINITION = "definition-2";
const PLUGIN_TRAFFIC_COST = 700;
const OTHER_PLUGIN_TRAFFIC_COST = 900;
const INTERVAL_MS = 1000;

describe("CapsDefinitionPluginCantonContractAdapter", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("runs on the plugin contract of its definition when the operator has another one", async () => {
    const client = new CantonClient(new JsonCantonApi("http://localhost:7575"));
    spyOnFilteredActiveContracts(client, "getActiveTemplateContractsData", [
      activeContract(
        "plugin-of-other-definition",
        { definition: OTHER_DEFINITION, paidTrafficCost: OTHER_PLUGIN_TRAFFIC_COST.toString() },
        { signatories: [OPERATOR_PARTY_ID] }
      ),
      activeContract(
        "plugin",
        { definition: DEFINITION, paidTrafficCost: PLUGIN_TRAFFIC_COST.toString() },
        { signatories: [OPERATOR_PARTY_ID] }
      ),
    ]);

    expect(await new TestDefinitionPlugin(client).run()).toBe(PLUGIN_TRAFFIC_COST);
  });
});

class TestDefinitionPlugin extends CapsDefinitionPluginCantonContractAdapter<TestPluginArgument> {
  constructor(client: CantonClient) {
    super(client, "#test-plugin", "Test.Plugin:Plugin", OPERATOR_PARTY_ID, INTERVAL_MS, DEFINITION);
  }

  protected async execute() {
    const plugin = await this.fetchPluginContract();

    return Number(plugin.createArgument.paidTrafficCost);
  }
}
