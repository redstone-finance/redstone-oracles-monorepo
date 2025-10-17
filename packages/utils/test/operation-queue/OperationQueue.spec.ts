import sinon from "sinon";
import { OperationQueue } from "../../src";
import { sleep } from "../../src/common";

const OP_TIME_MS = 20;
const WAIT_FOR_OP_MS = OP_TIME_MS + 5;

describe("OperationQueue tests", () => {
  let sut: OperationQueue;

  beforeEach(() => {
    sut = new OperationQueue();
  });

  it("should add a new operation to the queue", async () => {
    const operation = makeOperationSpy();
    sut.enqueue("op1", operation);

    await sleep(WAIT_FOR_OP_MS);

    expect(operation.called).toBeTruthy();
  });

  it("should replace an existing operation in the queue", async () => {
    const operation1 = makeOperationSpy();
    const operation2 = makeOperationSpy();
    const operation3 = makeOperationSpy();

    sut.enqueue("op1", operation1);
    sut.enqueue("op2", operation2);
    sut.enqueue("op2", operation3);

    await sleep(OP_TIME_MS + WAIT_FOR_OP_MS);

    expect(operation1.called).toBeTruthy();
    expect(operation2.called).toBeFalsy();
    expect(operation3.called).toBeTruthy();
    expect(operation1.calledBefore(operation3)).toBeTruthy();
  });

  it("should not replace an active operation", async () => {
    const operation1 = makeOperationSpy();
    const operation2 = makeOperationSpy();

    sut.enqueue("op1", operation1);
    const result = sut.enqueue("op1", operation2);

    expect(result).toBeFalsy();

    await sleep(WAIT_FOR_OP_MS);

    expect(operation1.called).toBeTruthy();
    expect(operation2.called).toBeFalsy();
  });

  it("should not replace an active operation, but add if can add when is running", async () => {
    const operation1 = makeOperationSpy();
    const operation2 = makeOperationSpy();

    sut.enqueue("op1", operation1);
    const result = sut.enqueue("op1", operation2, true);

    expect(result).toBeTruthy();

    await sleep(WAIT_FOR_OP_MS);

    expect(operation1.called).toBeTruthy();
    expect(operation2.called).toBeTruthy();
  });

  it("should process operations in order", async () => {
    const operation1 = makeOperationSpy();
    const operation2 = makeOperationSpy();

    sut.enqueue("op1", operation1);
    sut.enqueue("op2", operation2);

    await sleep(WAIT_FOR_OP_MS);

    expect(operation1.calledBefore(operation2)).toBeTruthy();
    expect(operation2.called).toBeTruthy();
  });

  it("should handle operation errors gracefully", async () => {
    const failingOperation = sinon.fake.rejects(new Error("Test error"));
    sut.enqueue("op1", failingOperation);

    await sleep(WAIT_FOR_OP_MS);

    expect(failingOperation.threw).toBeTruthy();
  });

  function makeOperationSpy() {
    return sinon.fake(async () => {
      await sleep(OP_TIME_MS);
    });
  }
});
