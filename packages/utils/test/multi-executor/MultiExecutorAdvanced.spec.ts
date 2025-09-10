import "dotenv/config";
import {
  createForSubInstances,
  DEFAULT_CONFIG,
  ExecutionMode,
  FnBox,
  FnDelegate,
} from "../../src/multi-executor";
import { MockClient, OneOfTypes } from "./MockClient";
import { makeSut } from "./MultiExecutor.spec";

const EXEC_TIME = 20;
const CLIENTS = [
  new MockClient(0, EXEC_TIME * 2),
  new MockClient(1, EXEC_TIME),
  new MockClient(2, EXEC_TIME * 3),
];

describe("MultiExecutor Advanced Concepts", () => {
  it("createForSubInstances", async () => {
    const sut = makeSut(CLIENTS);
    const wrappingSut = createForSubInstances(sut, (client) => new WrappingMockClient(client), {
      someWrappingMethod: ExecutionMode.FALLBACK,
    });

    const result = await wrappingSut.someWrappingMethod(234);
    expect(result).toEqual("0#234");

    CLIENTS.forEach((instance) => {
      expect(instance.calledArgs).toStrictEqual(CLIENTS.indexOf(instance) === 0 ? [234] : []);
    });
  });

  it("Fallback should move to not quarantined function", async () => {
    await performQuarantineTests(CLIENTS, ExecutionMode.FALLBACK, [0], "1", [1]);
  });

  it("Fallback should fail if all functions are quarantined", async () => {
    await performAllQuarantinedTests(CLIENTS, ExecutionMode.FALLBACK, "All promises failed");
  });

  it("Race must not execute quarantined function", async () => {
    await performQuarantineTests(CLIENTS, ExecutionMode.RACE, [0, 1], "2", [2]);
  });

  it("Race should fail if all functions are quarantined", async () => {
    await performAllQuarantinedTests(CLIENTS, ExecutionMode.RACE);
  });

  it("Agreement should agree with not quarantined function", async () => {
    const instances = [
      CLIENTS[0],
      CLIENTS[1],
      new MockClient(1, 0),
      new MockClient(0, 3 * EXEC_TIME),
    ];

    await performQuarantineTests(instances, ExecutionMode.AGREEMENT, [1], "0", [0, 2, 3]);
  });

  it("Agreement should agree with one if all others are quarantined", async () => {
    await performQuarantineTests(CLIENTS, ExecutionMode.AGREEMENT, [0, 1], "2", [2]);
  });

  it("Agreement should fail if all functions are quarantined", async () => {
    await performAllQuarantinedTests(CLIENTS, ExecutionMode.AGREEMENT);
  });

  async function performQuarantineTests(
    instances: MockClient[],
    mode: ExecutionMode,
    quarantinedIndices: number[],
    expectedWinner: string,
    runIndices: number[]
  ) {
    const sut = makeQuarantineSut(instances, mode, quarantinedIndices);
    const result = await sut.someAsyncFunction(234);

    expect(result).toEqual(`${expectedWinner}#234`);
    instances.forEach((instance) => {
      expect(instance.calledArgs).toStrictEqual(
        runIndices.includes(instances.indexOf(instance)) ? [234] : []
      );
    });
  }

  async function performAllQuarantinedTests(
    instances: MockClient[],
    mode: ExecutionMode,
    expectedError = "All functions are quarantined. Cannot execute them!"
  ) {
    const sut = makeQuarantineSut(
      instances,
      mode,
      instances.map((_, index) => index)
    );
    await expect(sut.someAsyncFunction(234)).rejects.toThrowError(expectedError);

    instances.forEach((instance) => {
      expect(instance.calledArgs).toStrictEqual([]);
    });
  }

  function makeQuarantineSut(
    instances: MockClient[],
    mode: ExecutionMode,
    quarantinedIndices: number[]
  ) {
    return makeSut(
      instances,
      {
        someAsyncFunction: mode,
      },
      {
        ...DEFAULT_CONFIG,
        delegate: new MockQuarantineFnDelegate(quarantinedIndices.map(String)),
        descriptions: instances.map((_, index) => index.toString()),
      }
    );
  }
});

class WrappingMockClient extends MockClient {
  constructor(private readonly mockClient: MockClient) {
    super(mockClient.ident + 1000, mockClient.execTime, mockClient.isFailing);
  }

  async someWrappingMethod(arg: OneOfTypes) {
    return await this.mockClient.someAsyncFunction(arg);
  }
}

class MockQuarantineFnDelegate implements FnDelegate {
  constructor(private readonly quarantinedItems: (string | undefined)[]) {}

  isQuarantined<R>(fnBox: FnBox<R>) {
    return this.quarantinedItems.includes(fnBox.description);
  }
}
