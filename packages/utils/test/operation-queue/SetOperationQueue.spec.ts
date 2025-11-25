import sinon from "sinon";
import { SetOperationQueue } from "../../src";
import { sleep } from "../../src/common";

const OP_TIME_MS = 20;
const WAIT_FOR_OP_MS = OP_TIME_MS + 5;

function makeSet(...elts: string[]) {
  return new Set(elts);
}

describe("SetOperationQueue tests", () => {
  let sut: SetOperationQueue;

  beforeEach(() => {
    sut = new SetOperationQueue();
  });

  it("should add a new operation to the queue", async () => {
    const operation = makeOperationSpy();
    sut.enqueue(makeSet("op1"), operation);

    await sleep(WAIT_FOR_OP_MS);

    expect(operation.called).toBeTruthy();
  });

  it("should replace an existing operation in the queue", async () => {
    const operation1 = makeOperationSpy();
    const operation2 = makeOperationSpy();
    const operation3 = makeOperationSpy();

    sut.enqueue(makeSet("op1"), operation1);
    sut.enqueue(makeSet("op2"), operation2);
    sut.enqueue(makeSet("op2", "op1"), operation3);

    await sleep(OP_TIME_MS + WAIT_FOR_OP_MS);

    expect(operation1.called).toBeTruthy();
    expect(operation2.called).toBeFalsy();
    expect(operation3.called).toBeTruthy();
    expect(operation1.calledBefore(operation3)).toBeTruthy();
  });

  it("should not replace an active operation in the queue and should not if not subsetting", async () => {
    const operation1 = makeOperationSpy();
    const operation2 = makeOperationSpy();
    const operation3 = makeOperationSpy();
    const operation4 = makeOperationSpy();

    sut.enqueue(makeSet("op1"), operation1);
    sut.enqueue(makeSet("op2", "op1"), operation2);

    await sleep(OP_TIME_MS);

    sut.enqueue(makeSet("op1"), operation3);

    await sleep(OP_TIME_MS);

    sut.enqueue(makeSet("op2"), operation4);

    await sleep(OP_TIME_MS + WAIT_FOR_OP_MS);

    expect(operation1.called).toBeTruthy();
    expect(operation2.called).toBeTruthy();
    expect(operation3.called).toBeTruthy();
    expect(operation4.called).toBeTruthy();
    expect(operation1.calledBefore(operation3)).toBeTruthy();
  });

  it("should replace non-active and purge properly", async () => {
    const operation1 = makeOperationSpy();
    const operation2 = makeOperationSpy();
    const operation3 = makeOperationSpy();
    const operation4 = makeOperationSpy();

    sut.enqueue(makeSet("op1"), operation1);
    sut.enqueue(makeSet("op2"), operation2);
    sut.enqueue(makeSet("op3"), operation3);
    sut.enqueue(makeSet("op2", "op1"), operation4);

    await sleep(OP_TIME_MS + WAIT_FOR_OP_MS);

    expect(operation1.called).toBeTruthy();
    expect(operation2.called).toBeFalsy();
    expect(operation3.called).toBeTruthy();
    expect(operation4.called).toBeTruthy();
    expect(operation1.calledBefore(operation3)).toBeTruthy();
    expect(operation4.calledBefore(operation3)).toBeTruthy();
  });

  it("should not replace an active operation", async () => {
    const operation1 = makeOperationSpy();
    const operation2 = makeOperationSpy();

    sut.enqueue(makeSet("op1"), operation1);
    const result = sut.enqueue(makeSet("op1"), operation2);

    expect(result).toBeFalsy();

    await sleep(WAIT_FOR_OP_MS);

    expect(operation1.called).toBeTruthy();
    expect(operation2.called).toBeFalsy();
  });

  it("should not replace an active operation, but add if can add when is running", async () => {
    const operation1 = makeOperationSpy();
    const operation2 = makeOperationSpy();

    sut.enqueue(makeSet("op1"), operation1);
    const result = sut.enqueue(makeSet("op1", "op2"), operation2, true);

    expect(result).toBeTruthy();

    await sleep(WAIT_FOR_OP_MS);

    expect(operation1.called).toBeTruthy();
    expect(operation2.called).toBeTruthy();
  });

  it("should process operations in order", async () => {
    const operation1 = makeOperationSpy();
    const operation2 = makeOperationSpy();

    sut.enqueue(makeSet("op1", "op2"), operation1);
    sut.enqueue(makeSet("op2"), operation2);

    await sleep(WAIT_FOR_OP_MS);

    expect(operation1.calledBefore(operation2)).toBeTruthy();
    expect(operation2.called).toBeTruthy();
  });

  it("should handle operation errors gracefully", async () => {
    const failingOperation = sinon.fake.rejects(new Error("Test error"));
    sut.enqueue(makeSet("op1"), failingOperation);

    await sleep(WAIT_FOR_OP_MS);

    expect(failingOperation.threw).toBeTruthy();
  });

  function makeOperationSpy() {
    return sinon.fake(async () => {
      await sleep(OP_TIME_MS);
    });
  }
});
