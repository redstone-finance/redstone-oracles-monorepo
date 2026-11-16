import { CantonClient, JsonCantonApi } from "../src";
import { CapsApiCantonContractAdapter } from "../src/adapters/CapsApiCantonContractAdapter";
import contracts from "../src/canton-defs.json";
import { activeContract, spyOnFilteredActiveContracts } from "./test-helpers";

const Defs = contracts.devnet;
const OPERATOR_PARTY_ID = "RedStoneOracleUpdater::1220ab";
const OTHER_PARTY_ID = "RedStoneOracleViewer::1220ab";
const DEFINITION = "definition-1";
const OTHER_DEFINITION = "definition-2";
const INTERFACE_NAME = "Caps.Api.CoreV1:Round";
const OWN_CONTRACT_ID = "own";

describe("CapsApiCantonContractAdapter", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns the contracts of the definition signed by the party", async () => {
    const { sut } = makeAdapter();

    const found = await sut.fetch();

    expect(found.map(({ contractId }) => contractId)).toEqual([OWN_CONTRACT_ID]);
  });

  it("reads the interface of the CAPS API package", async () => {
    const { sut, getActiveContractsData } = makeAdapter();

    await sut.fetch();
    const [[actAs, interfaceId]] = getActiveContractsData.mock.calls;

    expect([actAs, interfaceId]).toEqual([
      OPERATOR_PARTY_ID,
      `${Defs.capsInterfaceId}:${INTERFACE_NAME}`,
    ]);
  });

  function makeAdapter() {
    const client = new CantonClient(new JsonCantonApi("http://localhost:7575"));
    const getActiveContractsData = spyOnFilteredActiveContracts(client, "getActiveContractsData", [
      activeContract(
        OWN_CONTRACT_ID,
        { definition: DEFINITION },
        { signatories: [OPERATOR_PARTY_ID] }
      ),
      activeContract(
        "other-definition",
        { definition: OTHER_DEFINITION },
        { signatories: [OPERATOR_PARTY_ID] }
      ),
      activeContract(
        "other-signatory",
        { definition: DEFINITION },
        { signatories: [OTHER_PARTY_ID] }
      ),
    ]);

    return { sut: new TestCapsApiCantonContractAdapter(client), getActiveContractsData };
  }
});

class TestCapsApiCantonContractAdapter extends CapsApiCantonContractAdapter {
  constructor(client: CantonClient) {
    super(client, INTERFACE_NAME, OPERATOR_PARTY_ID, DEFINITION);
  }

  async fetch() {
    return await this.fetchDefinitionContracts();
  }
}
