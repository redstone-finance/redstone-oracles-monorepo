import { expect } from "chai";
import { ethers } from "ethers";
import Sinon from "sinon";
import { TxDeliverySigner } from "../../src/tx-delivery-man/TxDelivery";
import { TxNonceCoordinator } from "../../src/tx-delivery-man/TxNonceCoordinator";

const ADDRESS = "0x" + "1".repeat(40);

type ProviderStubs = {
  getTransactionCount: Sinon.SinonStub;
  getTransactionReceipt: Sinon.SinonStub;
};

const createProvider = (counts: number[]): ethers.providers.JsonRpcProvider & ProviderStubs => {
  const getTransactionCount = Sinon.stub();
  counts.forEach((value, idx) => getTransactionCount.onCall(idx).resolves(value));
  // fallback to last value for extra calls
  getTransactionCount.callsFake(() => counts[counts.length - 1]);

  const getTransactionReceipt = Sinon.stub().resolves(undefined);

  return {
    getTransactionCount,
    getTransactionReceipt,
  } as unknown as ethers.providers.JsonRpcProvider & ProviderStubs;
};

describe("TxNonceCoordinator", () => {
  let clock: Sinon.SinonFakeTimers;
  const getAddressStub = Sinon.stub().resolves(ADDRESS);
  const signer: TxDeliverySigner = {
    getAddress: getAddressStub,
    // not used inside coordinator; stubbed for type completeness
    signTransaction: () => Promise.resolve(""),
  };

  beforeEach(() => {
    clock = Sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
    getAddressStub.resetHistory();
  });

  it("aligns with highest chain nonce and increments sequentially", async () => {
    const providerA = createProvider([3]);
    const providerB = createProvider([5]);

    const coordinator = new TxNonceCoordinator([providerA, providerB], signer, {
      fastBroadcastMode: true,
    });

    const first = await coordinator.allocateNonce();
    const second = await coordinator.allocateNonce();

    expect(first).to.eq(5);
    expect(second).to.eq(6);
    Sinon.assert.calledWith(providerA.getTransactionCount, ADDRESS, "pending");
    Sinon.assert.calledWith(providerB.getTransactionCount, ADDRESS, "pending");
  });

  it("removes pending tx after mining success and keeps nonce advanced", async () => {
    const provider = createProvider([1]);
    provider.getTransactionReceipt.resolves({
      status: 1,
      blockNumber: 1,
    });

    const coordinator = new TxNonceCoordinator([provider], signer, {
      fastBroadcastMode: true,
    });

    const nonce = await coordinator.allocateNonce();
    coordinator.registerPendingTx(nonce, "0xhash");

    await clock.tickAsync(500);

    const next = await coordinator.allocateNonce();
    expect(next).to.eq(nonce + 1);
  });
});
