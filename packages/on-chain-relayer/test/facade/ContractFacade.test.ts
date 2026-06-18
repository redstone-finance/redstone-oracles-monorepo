import { expect } from "chai";
import sinon from "sinon";
import { ContractFacade } from "../../src";
import { BlockProviderMock, ContractAdapterMock } from "../relayer/run-iteration-mocks";

const FEED_IDS = ["ETH", "BTC"];
const BLOCK_TAG = 100;
const WITH_DATA_FEED_VALUES = true;
const EXPECTED_READ_ARGS = [FEED_IDS, BLOCK_TAG, WITH_DATA_FEED_VALUES];

describe("ContractFacade contract data cache", () => {
  let adapter: ContractAdapterMock;
  let sut: InspectableContractFacade;

  beforeEach(() => {
    adapter = new ContractAdapterMock();
    sut = new InspectableContractFacade(adapter, new BlockProviderMock());
  });

  it("reads once and serves the cached value for the same block, feeds and flag", async () => {
    const readSpy = sinon.spy(adapter, "readContractData");

    const first = await sut.readContractDataByBlock(FEED_IDS, BLOCK_TAG, WITH_DATA_FEED_VALUES);
    const second = await sut.readContractDataByBlock(FEED_IDS, BLOCK_TAG, WITH_DATA_FEED_VALUES);

    expect(second).to.equal(first);
    expect(readSpy.args).to.deep.equal([EXPECTED_READ_ARGS]);
  });

  it("does not cache a failed read - the next call fetches again", async () => {
    const readStub = sinon.stub(adapter, "readContractData").rejects(new Error("read failed"));

    await expectToReject(sut.readContractDataByBlock(FEED_IDS, BLOCK_TAG, WITH_DATA_FEED_VALUES));
    await expectToReject(sut.readContractDataByBlock(FEED_IDS, BLOCK_TAG, WITH_DATA_FEED_VALUES));

    expect(readStub.args).to.deep.equal([EXPECTED_READ_ARGS, EXPECTED_READ_ARGS]);
  });
});

class InspectableContractFacade extends ContractFacade {
  readContractDataByBlock(feedIds: string[], blockTag: number, withDataFeedValues: boolean) {
    return this.getContractDataByBlock(feedIds, blockTag, withDataFeedValues);
  }
}

async function expectToReject(promise: Promise<unknown>) {
  try {
    await promise;
  } catch {
    return;
  }
  expect.fail("Expected promise to reject");
}
